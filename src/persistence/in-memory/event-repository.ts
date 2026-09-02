import { randomUUID } from 'node:crypto';
import type { DeliveryStatus } from '@/domain/events/events';
import type {
  DomainEventFilters,
  DomainEventRecord,
  EventRepository,
  NewDomainEvent,
} from '@/persistence/ports';

export function createInMemoryEventRepository(): EventRepository {
  const rows = new Map<string, DomainEventRecord>();
  const byDedupe = new Map<string, string>(); // `${studentId}:${dedupeKey}` -> id

  return {
    async append(input: NewDomainEvent) {
      const key = `${input.studentId}:${input.dedupeKey}`;
      const existingId = byDedupe.get(key);
      if (existingId) return { record: { ...rows.get(existingId)! }, created: false };

      const record: DomainEventRecord = {
        id: randomUUID(),
        studentId: input.studentId,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        payload: input.payload ?? {},
        deliveryStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      rows.set(record.id, record);
      byDedupe.set(key, record.id);
      return { record: { ...record }, created: true };
    },

    async list(studentId: string, filters: DomainEventFilters = {}) {
      const list = [...rows.values()]
        .filter((r) => r.studentId === studentId)
        .filter((r) => (filters.eventType ? r.eventType === filters.eventType : true))
        .filter((r) =>
          filters.deliveryStatus ? r.deliveryStatus === filters.deliveryStatus : true,
        )
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
        .map((r) => ({ ...r }));
      return filters.limit ? list.slice(0, filters.limit) : list;
    },

    async setDeliveryStatus(eventId: string, status: DeliveryStatus) {
      const r = rows.get(eventId);
      if (!r) throw new Error(`domain event ${eventId} not found`);
      r.deliveryStatus = status;
      return { ...r };
    },
  };
}
