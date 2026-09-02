import {
  assertAssessmentResult,
  type AssessmentResultDraft,
  type ErrorTransition,
  type ErrorType,
} from '@/domain/errors/errors';
import {
  recalibrateFromResult,
  type ChapterRecalibration,
  type RecalibrationChapterInput,
} from '@/domain/assessment/recalibration';
import { recalibrationV1 } from '@/config/recalibration';
import type {
  AssessmentResultRecord,
  QuestionErrorRecord,
  Repositories,
} from '@/persistence/ports';
import { calculateChapterReadiness } from './readiness';

type ResultRepos = Pick<
  Repositories,
  'assessment' | 'assessmentResult' | 'planning' | 'curriculum' | 'progress' | 'readiness'
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
  await applyAssessmentRecalibration(repos, academicYearId, assessmentId);
  return result;
}

/**
 * Recalibrate the tested chapters from a recorded result (docs/ALGORITHMS.md
 * §10): nudge each chapter's component scores toward what the result observed —
 * weighted by assessment type — and recompute its readiness. Evidence affects
 * only tested scopes. Idempotent-ish: re-running applies the model again to the
 * already-moved components, so callers run it once, on record.
 */
export async function applyAssessmentRecalibration(
  repos: Pick<
    Repositories,
    'assessment' | 'assessmentResult' | 'progress' | 'readiness' | 'planning'
  >,
  academicYearId: string,
  assessmentId: string,
  asOf?: string,
): Promise<ChapterRecalibration[]> {
  const [assessment, result] = await Promise.all([
    repos.assessment.getAssessment(assessmentId),
    repos.assessmentResult.getResult(assessmentId),
  ]);
  if (!assessment || !result || assessment.academicYearId !== academicYearId) return [];
  if (!result.maxMarks) return [];

  const lostByChapter = new Map<string, Partial<Record<ErrorType, number>>>();
  for (const e of result.errors) {
    const perType = lostByChapter.get(e.chapterId) ?? {};
    perType[e.errorType] = (perType[e.errorType] ?? 0) + e.marksLost;
    lostByChapter.set(e.chapterId, perType);
  }

  const chapters: RecalibrationChapterInput[] = [];
  for (const chapterId of assessment.chapterIds) {
    const progress = await repos.progress.getChapterProgress(academicYearId, chapterId);
    if (!progress) continue;
    chapters.push({
      chapterId,
      components: {
        conceptScore: progress.conceptScore,
        practiceScore: progress.practiceScore,
        testScore: progress.testScore,
        recallScore: progress.recallScore,
        revisionScore: progress.revisionScore,
      },
      marksLostByType: lostByChapter.get(chapterId) ?? {},
    });
  }

  const recalibrations = recalibrateFromResult(
    {
      assessmentType: assessment.type,
      score: result.score,
      maxMarks: result.maxMarks,
      chapters,
    },
    recalibrationV1,
  );

  const on = asOf ?? assessment.examDate;
  for (const r of recalibrations) {
    await repos.progress.setChapterProgress(academicYearId, r.chapterId, r.components);
    await calculateChapterReadiness(repos, academicYearId, r.chapterId, { asOf: on });
  }
  return recalibrations;
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
