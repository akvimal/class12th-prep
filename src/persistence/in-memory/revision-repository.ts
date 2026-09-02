import { randomUUID } from 'node:crypto';
import type { RevisionOutcome, RevisionStatus } from '@/domain/revision/revision';
import type {
  NewRevisionSchedule,
  RevisionFilters,
  RevisionRepository,
  RevisionScheduleRecord,
} from '@/persistence/ports';

export function createInMemoryRevisionRepository(): RevisionRepository {
  const rows = new Map<string, RevisionScheduleRecord>();

  const activeFor = (academicYearId: string, chapterId: string) =>
    [...rows.values()].find(
      (r) =>
        r.academicYearId === academicYearId &&
        r.chapterId === chapterId &&
        r.status === 'SCHEDULED',
    );

  return {
    async schedule(input: NewRevisionSchedule) {
      if (activeFor(input.academicYearId, input.chapterId)) {
        throw new Error('a revision is already scheduled for this chapter');
      }
      const record: RevisionScheduleRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        chapterId: input.chapterId,
        revisionNumber: input.revisionNumber,
        dueDate: input.dueDate,
        method: input.method,
        status: 'SCHEDULED',
        outcome: null,
        completedOn: null,
        createdAt: new Date().toISOString(),
      };
      rows.set(record.id, record);
      return { ...record };
    },

    async getActive(academicYearId: string, chapterId: string) {
      const r = activeFor(academicYearId, chapterId);
      return r ? { ...r } : null;
    },

    async listSchedules(academicYearId: string, filters: RevisionFilters = {}) {
      const list = [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .filter((r) => (filters.status ? r.status === filters.status : true))
        .filter((r) => (filters.chapterId ? r.chapterId === filters.chapterId : true))
        .filter((r) => (filters.dueOnOrBefore ? r.dueDate <= filters.dueOnOrBefore : true))
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
        .map((r) => ({ ...r }));
      return filters.limit ? list.slice(0, filters.limit) : list;
    },

    async complete(scheduleId, input: { outcome: RevisionOutcome; completedOn: string }) {
      const r = rows.get(scheduleId);
      if (!r) throw new Error(`revision schedule ${scheduleId} not found`);
      r.status = 'DONE';
      r.outcome = input.outcome;
      r.completedOn = input.completedOn;
      return { ...r };
    },

    async setStatus(scheduleId: string, status: RevisionStatus) {
      const r = rows.get(scheduleId);
      if (!r) throw new Error(`revision schedule ${scheduleId} not found`);
      r.status = status;
      return { ...r };
    },
  };
}
