import { randomUUID } from 'node:crypto';
import { assertComponentScores } from '@/domain/progress/chapter-progress';
import { defaultChapterProgress, type ChapterProgressView } from '@/domain/progress/view';
import type { ChapterProgressPatch, ProgressRepository } from '@/persistence/ports';

interface Row extends ChapterProgressView {
  id: string;
  academicYearId: string;
}

export function createInMemoryProgressRepository(): ProgressRepository {
  const rows = new Map<string, Row>();
  const key = (academicYearId: string, chapterId: string) => `${academicYearId}:${chapterId}`;

  const apply = (row: Row, patch: ChapterProgressPatch) => {
    if (patch.state !== undefined) row.state = patch.state;
    if (patch.confidence !== undefined) row.confidence = patch.confidence;
    if (patch.interest !== undefined) row.interest = patch.interest;
    if (patch.schoolStatus !== undefined) row.schoolStatus = patch.schoolStatus;
    if (patch.conceptScore !== undefined) row.conceptScore = patch.conceptScore;
    if (patch.practiceScore !== undefined) row.practiceScore = patch.practiceScore;
    if (patch.testScore !== undefined) row.testScore = patch.testScore;
    if (patch.recallScore !== undefined) row.recallScore = patch.recallScore;
    if (patch.revisionScore !== undefined) row.revisionScore = patch.revisionScore;
    if (patch.effectiveReadiness !== undefined) row.effectiveReadiness = patch.effectiveReadiness;
    if (patch.lastStudiedAt !== undefined) row.lastStudiedAt = patch.lastStudiedAt;
    if (patch.lastRevisedAt !== undefined) row.lastRevisedAt = patch.lastRevisedAt;
  };

  const view = (row: Row): ChapterProgressView => {
    const { id: _id, academicYearId: _y, ...rest } = row;
    return { ...rest };
  };

  return {
    async setChapterProgress(academicYearId, chapterId, patch) {
      assertComponentScores(patch);
      const k = key(academicYearId, chapterId);
      const row: Row = rows.get(k) ?? {
        id: randomUUID(),
        academicYearId,
        ...defaultChapterProgress(chapterId),
      };
      apply(row, patch);
      rows.set(k, row);
      return view(row);
    },

    async getChapterProgress(academicYearId, chapterId) {
      const row = rows.get(key(academicYearId, chapterId));
      return row ? view(row) : null;
    },

    async listChapterProgress(academicYearId) {
      return [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .sort((a, b) => (a.chapterId < b.chapterId ? -1 : a.chapterId > b.chapterId ? 1 : 0))
        .map(view);
    },
  };
}
