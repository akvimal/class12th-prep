import { assertComponentScores } from '@/domain/progress/chapter-progress';
import {
  mergeProgress,
  type ChapterProgressView,
  type SubjectWithProgress,
} from '@/domain/progress/view';
import type { ChapterProgressPatch, Repositories } from '@/persistence/ports';

type WithProgress = Pick<Repositories, 'progress' | 'planning' | 'curriculum'>;

export interface CurriculumProgress {
  academicYearId: string;
  curriculumVersionId: string | null;
  subjects: SubjectWithProgress[];
}

/**
 * The academic year's curriculum hierarchy with each chapter's progress
 * attached (default NOT_STARTED where nothing has been recorded).
 * Null when the academic year does not exist.
 */
export async function getCurriculumProgress(
  repos: WithProgress,
  academicYearId: string,
): Promise<CurriculumProgress | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  if (!year.curriculumVersionId) {
    return { academicYearId, curriculumVersionId: null, subjects: [] };
  }

  const [hierarchy, progressList] = await Promise.all([
    repos.curriculum.getHierarchy(year.curriculumVersionId),
    repos.progress.listChapterProgress(academicYearId),
  ]);

  const byChapter = new Map<string, ChapterProgressView>(progressList.map((p) => [p.chapterId, p]));

  return {
    academicYearId,
    curriculumVersionId: year.curriculumVersionId,
    subjects: mergeProgress(hierarchy, byChapter),
  };
}

export async function setChapterProgress(
  repos: WithProgress,
  academicYearId: string,
  chapterId: string,
  patch: ChapterProgressPatch,
): Promise<ChapterProgressView> {
  assertComponentScores(patch);
  return repos.progress.setChapterProgress(academicYearId, chapterId, patch);
}

/** Resolve a stable chapter key ("PHY01") to its id within an academic year's curriculum. */
export async function chapterIdForKey(
  repos: WithProgress,
  academicYearId: string,
  chapterKey: string,
): Promise<string | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year?.curriculumVersionId) return null;
  const hierarchy = await repos.curriculum.getHierarchy(year.curriculumVersionId);
  for (const subject of hierarchy) {
    for (const unit of subject.units) {
      for (const chapter of unit.chapters) {
        if (chapter.key === chapterKey) return chapter.id;
      }
    }
  }
  return null;
}
