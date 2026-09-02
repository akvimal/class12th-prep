import { and, desc, eq } from 'drizzle-orm';
import type { DeliveryStatus } from '@/domain/events/events';
import { domainEvents } from '@/persistence/schema';
import type {
  DomainEventFilters,
  DomainEventRecord,
  EventRepository,
  NewDomainEvent,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof domainEvents.$inferSelect;

function toRecord(row: Row): DomainEventRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    deliveryStatus: row.deliveryStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDrizzleEventRepository(db: DrizzleDb): EventRepository {
  return {
    async append(input: NewDomainEvent) {
      const inserted = await db
        .insert(domainEvents)
        .values({
          studentId: input.studentId,
          eventType: input.eventType,
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          payload: input.payload ?? {},
          dedupeKey: input.dedupeKey,
        })
        .onConflictDoNothing({ target: [domainEvents.studentId, domainEvents.dedupeKey] })
        .returning();

      if (inserted[0]) return { record: toRecord(inserted[0]), created: true };

      const [existing] = await db
        .select()
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.studentId, input.studentId),
            eq(domainEvents.dedupeKey, input.dedupeKey),
          ),
        );
      return { record: toRecord(existing!), created: false };
    },

    async list(studentId: string, filters: DomainEventFilters = {}) {
      const clauses = [eq(domainEvents.studentId, studentId)];
      if (filters.eventType) clauses.push(eq(domainEvents.eventType, filters.eventType));
      if (filters.deliveryStatus) {
        clauses.push(eq(domainEvents.deliveryStatus, filters.deliveryStatus));
      }
      const q = db
        .select()
        .from(domainEvents)
        .where(and(...clauses))
        .orderBy(desc(domainEvents.createdAt));
      const rows = await (filters.limit ? q.limit(filters.limit) : q);
      return rows.map(toRecord);
    },

    async setDeliveryStatus(eventId: string, status: DeliveryStatus) {
      const [row] = await db
        .update(domainEvents)
        .set({ deliveryStatus: status })
        .where(eq(domainEvents.id, eventId))
        .returning();
      if (!row) throw new Error(`domain event ${eventId} not found`);
      return toRecord(row);
    },
  };
}
