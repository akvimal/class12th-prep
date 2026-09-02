'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { uiContext } from '@/app-services/app-context';
import { chapterIdForKey } from '@/app-services/progress';
import { logStudy, updateChapterSelfAssessment } from '@/app-services/study-flow';
import {
  CHAPTER_STATES,
  CONFIDENCE_LEVELS,
  SCHOOL_CHAPTER_STATUSES,
} from '@/domain/progress/chapter-progress';
import { SESSION_COMPLETIONS, STUDY_SESSION_TYPES } from '@/domain/progress/study-session';

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
