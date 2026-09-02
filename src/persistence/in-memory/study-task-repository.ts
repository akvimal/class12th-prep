import { randomUUID } from 'node:crypto';
import type { StudyTaskStatus } from '@/domain/planning/study-task';
import type {
  NewStudyTask,
  StudyTaskFilters,
  StudyTaskRecord,
  StudyTaskRepository,
} from '@/persistence/ports';

export function createInMemoryStudyTaskRepository(): StudyTaskRepository {
  const rows = new Map<string, StudyTaskRecord>();

  const rowsFor = (academicYearId: string, plannedDate: string) =>
    [...rows.values()].filter(
      (r) => r.academicYearId === academicYearId && r.plannedDate === plannedDate,
    );

  return {
    async saveDailyPlan(academicYearId, plannedDate, tasks: NewStudyTask[]) {
      const dayRows = rowsFor(academicYearId, plannedDate);
      // A chapter already completed today is not re-proposed.
      const completed = new Set(
        dayRows.filter((r) => r.status === 'COMPLETED').map((r) => r.chapterId),
      );
      const pending = tasks.filter((t) => !completed.has(t.chapterId));
      const wanted = new Map(pending.map((t) => [t.chapterId, t]));
      const existing = dayRows.filter((r) => r.status === 'SCHEDULED');

      for (const row of existing) {
        if (!wanted.has(row.chapterId)) {
          row.status = 'CANCELLED';
          row.resolvedAt = new Date().toISOString();
        }
      }

      const out: StudyTaskRecord[] = [];
      for (const task of pending) {
        const current = existing.find(
          (r) => r.chapterId === task.chapterId && r.status === 'SCHEDULED',
        );
        if (current) {
          current.activity = task.activity;
          current.subjectId = task.subjectId;
          current.plannedMinutes = task.plannedMinutes;
          current.slot = task.slot;
          current.reasonCodes = [...task.reasonCodes];
          current.priorityScore = task.priorityScore ?? null;
          current.algorithmVersion = task.algorithmVersion ?? null;
          out.push({ ...current });
          continue;
        }
        const record: StudyTaskRecord = {
          id: randomUUID(),
          academicYearId,
          chapterId: task.chapterId,
          subjectId: task.subjectId,
          plannedDate,
          activity: task.activity,
          plannedMinutes: task.plannedMinutes,
          slot: task.slot,
          reasonCodes: [...task.reasonCodes],
          priorityScore: task.priorityScore ?? null,
          status: 'SCHEDULED',
          sourceSessionId: null,
          algorithmVersion: task.algorithmVersion ?? null,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        };
        rows.set(record.id, record);
        out.push({ ...record });
      }
      return out;
    },

    async listTasks(academicYearId: string, filters: StudyTaskFilters = {}) {
      return [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .filter((r) => (filters.status ? r.status === filters.status : true))
        .filter((r) => (filters.chapterId ? r.chapterId === filters.chapterId : true))
        .filter((r) => (filters.plannedDate ? r.plannedDate === filters.plannedDate : true))
        .filter((r) => (filters.from ? r.plannedDate >= filters.from : true))
        .filter((r) => (filters.to ? r.plannedDate <= filters.to : true))
        .sort((a, b) =>
          a.plannedDate < b.plannedDate
            ? -1
            : a.plannedDate > b.plannedDate
              ? 1
              : a.createdAt < b.createdAt
                ? -1
                : 1,
        )
        .map((r) => ({ ...r }));
    },

    async resolve(
      taskId: string,
      status: Exclude<StudyTaskStatus, 'SCHEDULED'>,
      opts: { sourceSessionId?: string | null; resolvedAt?: string } = {},
    ) {
      const r = rows.get(taskId);
      if (!r) throw new Error(`study task ${taskId} not found`);
      r.status = status;
      r.sourceSessionId = opts.sourceSessionId ?? r.sourceSessionId;
      r.resolvedAt = opts.resolvedAt ?? new Date().toISOString();
      return { ...r };
    },

    async missedCountByChapter(academicYearId: string) {
      const out: Record<string, number> = {};
      for (const r of rows.values()) {
        if (r.academicYearId === academicYearId && r.status === 'MISSED') {
          out[r.chapterId] = (out[r.chapterId] ?? 0) + 1;
        }
      }
      return out;
    },
  };
}
