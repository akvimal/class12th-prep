import { and, desc, eq } from 'drizzle-orm';
import type { WeeklyReview } from '@/domain/review/weekly-review';
import { weeklyReviews } from '@/persistence/schema';
import type { WeeklyReviewRecord, WeeklyReviewRepository } from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof weeklyReviews.$inferSelect;

function toRecord(row: Row): WeeklyReviewRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    weekStart: row.weekStart,
    weekEnd: row.weekEnd,
    summary: row.summary as WeeklyReview,
    algorithmVersion: row.algorithmVersion,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function createDrizzleWeeklyReviewRepository(db: DrizzleDb): WeeklyReviewRepository {
  return {
    async upsert(academicYearId, weekStart, weekEnd, summary: WeeklyReview) {
      const [row] = await db
        .insert(weeklyReviews)
        .values({
          academicYearId,
          weekStart,
          weekEnd,
          summary,
          algorithmVersion: summary.algorithmVersion,
        })
        .onConflictDoUpdate({
          target: [weeklyReviews.academicYearId, weeklyReviews.weekStart],
          set: { weekEnd, summary, algorithmVersion: summary.algorithmVersion, generatedAt: new Date() },
        })
        .returning();
      return toRecord(row!);
    },

    async get(academicYearId, weekStart) {
      const [row] = await db
        .select()
        .from(weeklyReviews)
        .where(
          and(
            eq(weeklyReviews.academicYearId, academicYearId),
            eq(weeklyReviews.weekStart, weekStart),
          ),
        );
      return row ? toRecord(row) : null;
    },

    async list(academicYearId, filters = {}) {
      const q = db
        .select()
        .from(weeklyReviews)
        .where(eq(weeklyReviews.academicYearId, academicYearId))
        .orderBy(desc(weeklyReviews.weekStart));
      const rows = await (filters.limit ? q.limit(filters.limit) : q);
      return rows.map(toRecord);
    },
  };
}
