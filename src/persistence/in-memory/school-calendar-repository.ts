import { randomUUID } from 'node:crypto';
import type { CalendarEvent } from '@/domain/planning/school-calendar';
import type {
  CalendarEventRecord,
  CalendarEventUpdate,
  NewCalendarEvent,
  SchoolCalendarRepository,
} from '@/persistence/ports';

export function createInMemorySchoolCalendarRepository(): SchoolCalendarRepository {
  const events = new Map<string, CalendarEventRecord>();

  const overlapping = (academicYearId: string, from?: string, to?: string) =>
    [...events.values()]
      .filter((e) => e.academicYearId === academicYearId)
      .filter((e) => (to ? e.startDate <= to : true))
      .filter((e) => (from ? e.endDate >= from : true))
      .sort((a, b) =>
        a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.id < b.id ? -1 : 1,
      );

  return {
    async addEvent(input: NewCalendarEvent) {
      const record: CalendarEventRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        type: input.type,
        title: input.title ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        capacityOverride: input.capacityOverride ?? null,
        notes: input.notes ?? null,
      };
      events.set(record.id, record);
      return { id: record.id };
    },

    async updateEvent(eventId: string, patch: CalendarEventUpdate) {
      const record = events.get(eventId);
      if (!record) throw new Error(`school calendar event ${eventId} not found`);
      Object.assign(record, patch);
      return { ...record };
    },

    async deleteEvent(eventId: string) {
      if (!events.delete(eventId)) throw new Error(`school calendar event ${eventId} not found`);
    },

    async listEvents(academicYearId: string, range?: { from?: string; to?: string }) {
      return overlapping(academicYearId, range?.from, range?.to).map((e) => ({ ...e }));
    },

    async eventsForCapacity(
      academicYearId: string,
      from: string,
      to: string,
    ): Promise<CalendarEvent[]> {
      return overlapping(academicYearId, from, to).map((e) => ({
        id: e.id,
        type: e.type,
        startDate: e.startDate,
        endDate: e.endDate,
        capacityOverride: e.capacityOverride,
      }));
    },
  };
}
