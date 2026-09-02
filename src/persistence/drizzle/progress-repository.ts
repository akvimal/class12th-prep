import { and, asc, eq } from 'drizzle-orm';
import { assertComponentScores } from '@/domain/progress/chapter-progress';
import type { ChapterProgressView } from '@/domain/progress/view';
import { chapterProgress } from '@/persistence/schema';
import type { ChapterProgressPatch, ProgressRepository } from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof chapterProgress.$inferSelect;
type Insert = typeof chapterProgress.$inferInsert;

function toView(row: Row): ChapterProgressView {
  return {
    chapterId: row.chapterId,
    state: row.state,
    confidence: row.confidence,
    interest: row.interest,
    schoolStatus: row.schoolStatus,
    conceptScore: row.conceptScore,
    practiceScore: row.practiceScore,
    testScore: row.testScore,
    recallScore: row.recallScore,
    revisionScore: row.revisionScore,
    effectiveReadiness: row.effectiveReadiness,
    lastStudiedAt: row.lastStudiedAt ? row.lastStudiedAt.toISOString() : null,
    lastRevisedAt: row.lastRevisedAt ? row.lastRevisedAt.toISOString() : null,
  };
}

function toColumns(patch: ChapterProgressPatch): Partial<Insert> {
  const out: Partial<Insert> = {};
  if (patch.state !== undefined) out.state = patch.state;
  if (patch.confidence !== undefined) out.confidence = patch.confidence;
  if (patch.interest !== undefined) out.interest = patch.interest;
  if (patch.schoolStatus !== undefined) out.schoolStatus = patch.schoolStatus;
  if (patch.conceptScore !== undefined) out.conceptScore = patch.conceptScore;
  if (patch.practiceScore !== undefined) out.practiceScore = patch.practiceScore;
  if (patch.testScore !== undefined) out.testScore = patch.testScore;
  if (patch.recallScore !== undefined) out.recallScore = patch.recallScore;
  if (patch.revisionScore !== undefined) out.revisionScore = patch.revisionScore;
  if (patch.effectiveReadiness !== undefined) out.effectiveReadiness = patch.effectiveReadiness;
  if (patch.lastStudiedAt !== undefined) {
    out.lastStudiedAt = patch.lastStudiedAt ? new Date(patch.lastStudiedAt) : null;
  }
  if (patch.lastRevisedAt !== undefined) {
    out.lastRevisedAt = patch.lastRevisedAt ? new Date(patch.lastRevisedAt) : null;
  }
  return out;
}

export function createDrizzleProgressRepository(db: DrizzleDb): ProgressRepository {
  return {
    async setChapterProgress(academicYearId, chapterId, patch) {
      assertComponentScores(patch);
      const columns = toColumns(patch);
      const [row] = await db
        .insert(chapterProgress)
        .values({ academicYearId, chapterId, ...columns })
        .onConflictDoUpdate({
          target: [chapterProgress.academicYearId, chapterProgress.chapterId],
          set: Object.keys(columns).length > 0 ? columns : { updatedAt: new Date() },
        })
        .returning();
      return toView(row!);
    },

    async getChapterProgress(academicYearId, chapterId) {
      const [row] = await db
        .select()
        .from(chapterProgress)
        .where(
          and(
            eq(chapterProgress.academicYearId, academicYearId),
            eq(chapterProgress.chapterId, chapterId),
          ),
        );
      return row ? toView(row) : null;
    },

    async listChapterProgress(academicYearId) {
      const rows = await db
        .select()
        .from(chapterProgress)
        .where(eq(chapterProgress.academicYearId, academicYearId))
        .orderBy(asc(chapterProgress.chapterId));
      return rows.map(toView);
    },
  };
}
