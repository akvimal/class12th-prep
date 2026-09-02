import { errorPatternsV1 } from '@/config/error-patterns';
import { detectErrorPatterns, type ErrorPattern } from '@/domain/errors/patterns';
import type { Repositories } from '@/persistence/ports';

type PatternRepos = Pick<Repositories, 'assessmentResult' | 'planning' | 'curriculum'>;

export interface ErrorPatternView extends ErrorPattern {
  subjectName: string;
  chapterName: string | null;
}

/**
 * Recurring error patterns for the academic year (docs/SRS.md §12) — the same
 * error type showing up again and again in a chapter, or across a subject.
 */
export async function getErrorPatterns(
  repos: PatternRepos,
  academicYearId: string,
): Promise<ErrorPatternView[]> {
  const errors = await repos.assessmentResult.listErrors(academicYearId);
  const patterns = detectErrorPatterns(
    errors.map((e) => ({
      subjectId: e.subjectId,
      chapterId: e.chapterId,
      errorType: e.errorType,
      marksLost: e.marksLost,
      on: e.createdAt.slice(0, 10),
    })),
    errorPatternsV1,
  );
  if (patterns.length === 0) return [];

  const year = await repos.planning.getAcademicYear(academicYearId);
  const hierarchy = year?.curriculumVersionId
    ? await repos.curriculum.getHierarchy(year.curriculumVersionId)
    : [];
  const subjectName = new Map(hierarchy.map((s) => [s.id, s.name]));
  const chapterName = new Map(
    hierarchy.flatMap((s) => s.units.flatMap((u) => u.chapters.map((c) => [c.id, c.name]))),
  );

  return patterns.map((p) => ({
    ...p,
    subjectName: subjectName.get(p.subjectId) ?? '',
    chapterName: p.chapterId ? (chapterName.get(p.chapterId) ?? null) : null,
  }));
}
