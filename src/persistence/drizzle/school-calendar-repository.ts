import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { CalendarEvent } from '@/domain/planning/school-calendar';
import { schoolCalendarEvents } from '@/persistence/schema';
import type {
  CalendarEventRecord,
  CalendarEventUpdate,
  NewCalendarEvent,
  SchoolCalendarRepository,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

function toRecord(row: typeof schoolCalendarEvents.$inferSelect): CalendarEventRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    type: row.type,
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    capacityOverride: row.capacityOverride,
    notes: row.notes,
  };
}

export function createDrizzleSchoolCalendarRepository(db: DrizzleDb): SchoolCalendarRepository {
  async function overlapping(academicYearId: string, from?: string, to?: string) {
    const clauses = [eq(schoolCalendarEvents.academicYearId, academicYearId)];
    if (to) clauses.push(lte(schoolCalendarEvents.startDate, to));
    if (from) clauses.push(gte(schoolCalendarEvents.endDate, from));
    return db
      .select()
      .from(schoolCalendarEvents)
      .where(and(...clauses))
      .orderBy(asc(schoolCalendarEvents.startDate), asc(schoolCalendarEvents.id));
  }

  return {
    async addEvent(input: NewCalendarEvent) {
      const [row] = await db
        .insert(schoolCalendarEvents)
        .values({
          academicYearId: input.academicYearId,
          type: input.type,
          title: input.title ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
          capacityOverride: input.capacityOverride ?? null,
          notes: input.notes ?? null,
        })
        .returning({ id: schoolCalendarEvents.id });
      return { id: row!.id };
    },

    async updateEvent(eventId: string, patch: CalendarEventUpdate) {
      const [row] = await db
        .update(schoolCalendarEvents)
        .set(patch)
        .where(eq(schoolCalendarEvents.id, eventId))
        .returning();
      if (!row) throw new Error(`school calendar event ${eventId} not found`);
      return toRecord(row);
    },

    async deleteEvent(eventId: string) {
      const deleted = await db
        .delete(schoolCalendarEvents)
        .where(eq(schoolCalendarEvents.id, eventId))
        .returning({ id: schoolCalendarEvents.id });
      if (deleted.length === 0) throw new Error(`school calendar event ${eventId} not found`);
    },

    async listEvents(academicYearId: string, range?: { from?: string; to?: string }) {
      const rows = await overlapping(academicYearId, range?.from, range?.to);
      return rows.map(toRecord);
    },

    async eventsForCapacity(academicYearId: string, from: string, to: string): Promise<CalendarEvent[]> {
      const rows = await overlapping(academicYearId, from, to);
      return rows.map((r) => ({
        id: r.id,
        type: r.type,
        startDate: r.startDate,
        endDate: r.endDate,
        capacityOverride: r.capacityOverride,
      }));
    },
  };
}
