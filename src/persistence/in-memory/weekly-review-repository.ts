import { randomUUID } from 'node:crypto';
import type { WeeklyReview } from '@/domain/review/weekly-review';
import type { WeeklyReviewRecord, WeeklyReviewRepository } from '@/persistence/ports';

export function createInMemoryWeeklyReviewRepository(): WeeklyReviewRepository {
  const rows = new Map<string, WeeklyReviewRecord>();
  const key = (academicYearId: string, weekStart: string) => `${academicYearId}:${weekStart}`;

  return {
    async upsert(academicYearId, weekStart, weekEnd, summary: WeeklyReview) {
      const existing = rows.get(key(academicYearId, weekStart));
      const record: WeeklyReviewRecord = {
        id: existing?.id ?? randomUUID(),
        academicYearId,
        weekStart,
        weekEnd,
        summary: structuredClone(summary),
        algorithmVersion: summary.algorithmVersion,
        generatedAt: new Date().toISOString(),
      };
      rows.set(key(academicYearId, weekStart), record);
      return structuredClone(record);
    },

    async get(academicYearId, weekStart) {
      const r = rows.get(key(academicYearId, weekStart));
      return r ? structuredClone(r) : null;
    },

    async list(academicYearId, filters = {}) {
      const list = [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .sort((a, b) => (a.weekStart > b.weekStart ? -1 : a.weekStart < b.weekStart ? 1 : 0))
        .map((r) => structuredClone(r));
      return filters.limit ? list.slice(0, filters.limit) : list;
    },
  };
}
