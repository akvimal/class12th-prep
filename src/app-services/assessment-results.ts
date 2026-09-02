import {
  assertAssessmentResult,
  type AssessmentResultDraft,
  type ErrorTransition,
  type ErrorType,
} from '@/domain/errors/errors';
import type {
  AssessmentResultRecord,
  QuestionErrorRecord,
  Repositories,
} from '@/persistence/ports';

type ResultRepos = Pick<
  Repositories,
  'assessment' | 'assessmentResult' | 'planning' | 'curriculum'
>;

export interface RecordResultInput {
  score: number;
  timeTakenMinutes?: number | null;
  errors: { chapterKey: string; errorType: ErrorType; marksLost: number; notes?: string | null }[];
}

/**
 * Record an assessment's result and its tagged errors. Marks the assessment
 * COMPLETED. The result and errors are immutable evidence — later corrections
 * are error-state transitions, not edits.
 */
export async function recordAssessmentResult(
  repos: ResultRepos,
  academicYearId: string,
  assessmentId: string,
  input: RecordResultInput,
): Promise<AssessmentResultRecord | null> {
  const assessment = await repos.assessment.getAssessment(assessmentId);
  if (!assessment || assessment.academicYearId !== academicYearId) return null;

  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year?.curriculumVersionId) return null;
  const hierarchy = await repos.curriculum.getHierarchy(year.curriculumVersionId);
  const chapterByKey = new Map(
    hierarchy.flatMap((s) =>
      s.units.flatMap((u) =>
        u.chapters.map((c) => [c.key, { id: c.id, subjectId: s.id }] as const),
      ),
    ),
  );
  const coveredChapters = new Set(assessment.chapterIds);

  const draft: AssessmentResultDraft = {
    score: input.score,
    maxMarks: assessment.maxMarks ?? 0,
    timeTakenMinutes: input.timeTakenMinutes,
    errors: input.errors.map((e) => ({
      chapterKey: e.chapterKey,
      errorType: e.errorType,
      marksLost: e.marksLost,
      notes: e.notes,
    })),
  };
  assertAssessmentResult(draft);

  const errors = input.errors.map((e) => {
    const chapter = chapterByKey.get(e.chapterKey);
    if (!chapter) throw new Error(`chapter "${e.chapterKey}" is not in this curriculum`);
    if (!coveredChapters.has(chapter.id)) {
      throw new Error(`chapter "${e.chapterKey}" is not covered by this test`);
    }
    return {
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      marksLost: e.marksLost,
      errorType: e.errorType,
      notes: e.notes ?? null,
    };
  });

  const result = await repos.assessmentResult.recordResult({
    assessmentId,
    score: input.score,
    maxMarks: assessment.maxMarks ?? 0,
    timeTakenMinutes: input.timeTakenMinutes ?? null,
    errors,
  });

  await repos.assessment.setStatus(assessmentId, 'COMPLETED');
  return result;
}

export function getAssessmentResult(
  repos: Pick<Repositories, 'assessmentResult'>,
  assessmentId: string,
): Promise<AssessmentResultRecord | null> {
  return repos.assessmentResult.getResult(assessmentId);
}

export interface QuestionErrorView extends QuestionErrorRecord {
  chapterName: string;
  subjectName: string;
}

export async function listQuestionErrors(
  repos: Pick<Repositories, 'assessmentResult' | 'planning' | 'curriculum'>,
  academicYearId: string,
  filters?: { state?: QuestionErrorRecord['state']; limit?: number },
): Promise<QuestionErrorView[]> {
  const errors = await repos.assessmentResult.listErrors(academicYearId, filters);
  const year = await repos.planning.getAcademicYear(academicYearId);
  const hierarchy = year?.curriculumVersionId
    ? await repos.curriculum.getHierarchy(year.curriculumVersionId)
    : [];
  const chapterName = new Map(
    hierarchy.flatMap((s) => s.units.flatMap((u) => u.chapters.map((c) => [c.id, c.name]))),
  );
  const subjectName = new Map(hierarchy.map((s) => [s.id, s.name]));

  return errors.map((e) => ({
    ...e,
    chapterName: chapterName.get(e.chapterId) ?? e.chapterId,
    subjectName: subjectName.get(e.subjectId) ?? '',
  }));
}

export function advanceQuestionError(
  repos: Pick<Repositories, 'assessmentResult'>,
  errorId: string,
  transition: ErrorTransition,
  opts?: { retestDueDate?: string | null },
): Promise<QuestionErrorRecord> {
  return repos.assessmentResult.advanceError(errorId, transition, opts);
}
