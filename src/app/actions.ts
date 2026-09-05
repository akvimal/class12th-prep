'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { uiContext } from '@/app-services/app-context';
import { addAssessment } from '@/app-services/assessment';
import { advanceQuestionError, recordAssessmentResult } from '@/app-services/assessment-results';
import { applyCourseCorrection } from '@/app-services/course-correction';
import { updatePreparationPlan } from '@/app-services/plan';
import { chapterIdForKey } from '@/app-services/progress';
import { logSatPrepSession } from '@/app-services/sat-prep';
import { logStudy, updateChapterSelfAssessment } from '@/app-services/study-flow';
import { addStudyWindow, removeStudyWindow, updateStudyWindow } from '@/app-services/study-windows';
import { ASSESSMENT_TYPES } from '@/domain/assessment/assessment';
import { ERROR_TRANSITIONS, ERROR_TYPES } from '@/domain/errors/errors';
import { COURSE_CORRECTION_KINDS } from '@/domain/planning/course-correction';
import { STUDY_WINDOW_DAY_TYPES } from '@/domain/planning/study-window';
import {
  CHAPTER_STATES,
  CONFIDENCE_LEVELS,
  SCHOOL_CHAPTER_STATUSES,
} from '@/domain/progress/chapter-progress';
import { SESSION_COMPLETIONS, STUDY_SESSION_TYPES } from '@/domain/progress/study-session';
import { SAT_DOMAINS } from '@/domain/sat/sat-domain';

/** "" (an untouched form field) → undefined, then run the inner schema. */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === '' || v == null ? undefined : v), schema.optional());
}

const minutes = z.coerce.number().int().min(0).max(600);
const score = optional(z.coerce.number().min(0).max(100));
const count = optional(z.coerce.number().int().min(0));

const logStudySchema = z.object({
  subjectKey: z.string().min(1),
  chapterKey: z.string().min(1),
  type: z.enum(STUDY_SESSION_TYPES),
  completion: z.enum(SESSION_COMPLETIONS),
  actualMinutes: minutes,
  attempted: count,
  correct: count,
  confidenceAfter: optional(z.enum(CONFIDENCE_LEVELS)),
  redirectTo: optional(z.string()),
});

const updateChapterSchema = z.object({
  subjectKey: z.string().min(1),
  chapterKey: z.string().min(1),
  schoolStatus: optional(z.enum(SCHOOL_CHAPTER_STATUSES)),
  state: optional(z.enum(CHAPTER_STATES)),
  confidence: optional(z.enum(CONFIDENCE_LEVELS)),
  conceptScore: score,
  practiceScore: score,
  testScore: score,
  recallScore: score,
  revisionScore: score,
});

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

export async function logStudyAction(formData: FormData): Promise<void> {
  const input = logStudySchema.parse(fields(formData));
  const { repos, academicYearId, asOf } = await uiContext();

  await logStudy(repos, academicYearId, {
    chapterKey: input.chapterKey,
    type: input.type,
    completion: input.completion,
    actualMinutes: input.actualMinutes,
    attempted: input.attempted ?? null,
    correct: input.correct ?? null,
    confidenceAfter: input.confidenceAfter ?? null,
    sessionDate: asOf,
  });

  revalidatePath('/', 'layout');
  redirect(input.redirectTo ?? `/subjects/${input.subjectKey}/${input.chapterKey}`);
}

const addAssessmentSchema = z.object({
  subjectKey: z.string().min(1),
  type: z.enum(ASSESSMENT_TYPES),
  name: z.string().min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxMarks: optional(z.coerce.number().int().positive()),
});

export async function addAssessmentAction(formData: FormData): Promise<void> {
  const input = addAssessmentSchema.parse(fields(formData));
  const chapterKeys = formData
    .getAll('chapterKeys')
    .filter((v): v is string => typeof v === 'string');
  const { repos, academicYearId } = await uiContext();

  await addAssessment(repos, academicYearId, {
    subjectKey: input.subjectKey,
    type: input.type,
    name: input.name,
    examDate: input.examDate,
    maxMarks: input.maxMarks ?? null,
    chapterKeys,
  });

  revalidatePath('/', 'layout');
  redirect('/tests');
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function addStudyWindowAction(formData: FormData): Promise<void> {
  const input = z
    .object({
      dayType: z.enum(STUDY_WINDOW_DAY_TYPES),
      startTime: hhmm,
      endTime: hhmm,
      label: optional(z.string()),
    })
    .parse(fields(formData));
  const { repos, academicYearId } = await uiContext();
  await addStudyWindow(repos, { academicYearId, ...input, label: input.label ?? null });
  revalidatePath('/', 'layout');
  redirect('/reminders');
}

export async function toggleStudyWindowAction(formData: FormData): Promise<void> {
  const { windowId, field, value } = z
    .object({
      windowId: z.string().min(1),
      field: z.enum(['enabled', 'reminderEnabled']),
      value: z.enum(['0', '1']),
    })
    .parse(fields(formData));
  const { repos } = await uiContext();
  await updateStudyWindow(repos, windowId, { [field]: value === '1' });
  revalidatePath('/', 'layout');
  redirect('/reminders');
}

export async function deleteStudyWindowAction(formData: FormData): Promise<void> {
  const { windowId } = z.object({ windowId: z.string().min(1) }).parse(fields(formData));
  const { repos } = await uiContext();
  await removeStudyWindow(repos, windowId);
  revalidatePath('/', 'layout');
  redirect('/reminders');
}

export async function editStudyWindowAction(formData: FormData): Promise<void> {
  const input = z
    .object({
      windowId: z.string().min(1),
      dayType: z.enum(STUDY_WINDOW_DAY_TYPES),
      startTime: hhmm,
      endTime: hhmm,
      label: optional(z.string()),
    })
    .parse(fields(formData));
  const { repos } = await uiContext();
  await updateStudyWindow(repos, input.windowId, {
    dayType: input.dayType,
    startTime: input.startTime,
    endTime: input.endTime,
    label: input.label ?? null,
  });
  revalidatePath('/', 'layout');
  redirect('/reminders');
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const planCapacityMinutes = z.coerce.number().int().min(0).max(600);

const updatePlanFormSchema = z.object({
  startDate: isoDate,
  syllabusTargetDate: isoDate,
  hardCompletionDate: isoDate,
  revisionStartDate: isoDate,
  examWindowStart: isoDate,
  examWindowEnd: isoDate,
  weekdayCapacityMinutes: planCapacityMinutes,
  weekendCapacityMinutes: planCapacityMinutes,
});

export async function updatePlanAction(formData: FormData): Promise<void> {
  const input = updatePlanFormSchema.parse(fields(formData));
  const { repos, planId } = await uiContext();
  await updatePreparationPlan(repos, planId, input);
  revalidatePath('/', 'layout');
  redirect('/plan');
}

const errorRowRe = /^error\.([A-Za-z0-9-]+)\.marks$/;

export async function recordResultAction(formData: FormData): Promise<void> {
  const base = z
    .object({
      assessmentId: z.string().min(1),
      score: z.coerce.number().int().min(0),
      timeTakenMinutes: optional(z.coerce.number().int().min(0)),
    })
    .parse(fields(formData));

  const f = fields(formData);
  const errors: {
    chapterKey: string;
    errorType: (typeof ERROR_TYPES)[number];
    marksLost: number;
  }[] = [];
  for (const [key, value] of Object.entries(f)) {
    const m = key.match(errorRowRe);
    if (!m) continue;
    const marksLost = Number(value);
    if (!Number.isFinite(marksLost) || marksLost <= 0) continue;
    const chapterKey = m[1]!;
    const type = f[`error.${chapterKey}.type`];
    errors.push({
      chapterKey,
      errorType: ERROR_TYPES.includes(type as never) ? (type as never) : 'UNKNOWN',
      marksLost,
    });
  }

  const { repos, academicYearId } = await uiContext();
  await recordAssessmentResult(repos, academicYearId, base.assessmentId, {
    score: base.score,
    timeTakenMinutes: base.timeTakenMinutes ?? null,
    errors,
  });

  revalidatePath('/', 'layout');
  redirect('/tests');
}

export async function advanceErrorAction(formData: FormData): Promise<void> {
  const { errorId, transition } = z
    .object({ errorId: z.string().min(1), transition: z.enum(ERROR_TRANSITIONS) })
    .parse(fields(formData));
  const { repos } = await uiContext();
  await advanceQuestionError(repos, errorId, transition);
  revalidatePath('/', 'layout');
  redirect('/tests');
}

export async function updateChapterAction(formData: FormData): Promise<void> {
  const input = updateChapterSchema.parse(fields(formData));
  const { repos, academicYearId, asOf } = await uiContext();

  const chapterId = await chapterIdForKey(repos, academicYearId, input.chapterKey);
  if (!chapterId) throw new Error(`chapter "${input.chapterKey}" not found`);

  await updateChapterSelfAssessment(
    repos,
    academicYearId,
    chapterId,
    {
      ...(input.schoolStatus ? { schoolStatus: input.schoolStatus } : {}),
      ...(input.state ? { state: input.state } : {}),
      ...(input.confidence ? { confidence: input.confidence } : {}),
      ...(input.conceptScore !== undefined ? { conceptScore: input.conceptScore } : {}),
      ...(input.practiceScore !== undefined ? { practiceScore: input.practiceScore } : {}),
      ...(input.testScore !== undefined ? { testScore: input.testScore } : {}),
      ...(input.recallScore !== undefined ? { recallScore: input.recallScore } : {}),
      ...(input.revisionScore !== undefined ? { revisionScore: input.revisionScore } : {}),
    },
    asOf,
  );

  revalidatePath('/', 'layout');
  redirect(`/subjects/${input.subjectKey}/${input.chapterKey}`);
}

const courseCorrectionSchema = z.object({
  kind: z.enum(COURSE_CORRECTION_KINDS),
  weekdayMinutesDelta: optional(z.coerce.number().int().min(1).max(180)),
  targetShiftDays: optional(z.coerce.number().int().min(1).max(60)),
  // ADD_CAPACITY needs an explicit confirm step.
  confirmed: optional(z.enum(['yes'])),
});

export async function applyCourseCorrectionAction(formData: FormData): Promise<void> {
  const input = courseCorrectionSchema.parse(fields(formData));
  if (input.kind === 'ADD_CAPACITY' && input.confirmed !== 'yes') {
    redirect('/course-correction?confirm=capacity');
  }

  const { repos, planId } = await uiContext();
  await applyCourseCorrection(repos, planId, input.kind, {
    weekdayMinutesDelta: input.weekdayMinutesDelta,
    targetShiftDays: input.targetShiftDays,
  });

  revalidatePath('/', 'layout');
  redirect(input.kind === 'REPRIORITISE' ? '/today' : '/trajectory');
}

const logSatPrepSessionSchema = z.object({
  planId: z.string().min(1),
  domain: optional(z.enum(SAT_DOMAINS)),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
  actualMinutes: z.coerce.number().int().min(1).max(600),
  fullPracticeTest: optional(z.enum(['on'])),
  notes: optional(z.string()),
});

export async function logSatPrepSessionAction(formData: FormData): Promise<void> {
  const input = logSatPrepSessionSchema.parse(fields(formData));
  const { repos } = await uiContext();
  await logSatPrepSession(repos, {
    planId: input.planId,
    domain: input.domain ?? null,
    sessionDate: input.sessionDate,
    actualMinutes: input.actualMinutes,
    fullPracticeTest: input.fullPracticeTest === 'on',
    notes: input.notes ?? null,
  });
  revalidatePath('/', 'layout');
  redirect('/exam-prep');
}
