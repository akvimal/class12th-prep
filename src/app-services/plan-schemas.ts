import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const minutes = z.number().int().min(0);
const marks = z.number().int().min(0).nullable().optional();

export const createPlanSchema = z.object({
  startDate: isoDate,
  syllabusTargetDate: isoDate,
  hardCompletionDate: isoDate,
  revisionStartDate: isoDate,
  examWindowStart: isoDate,
  examWindowEnd: isoDate,
  weekdayCapacityMinutes: minutes,
  weekendCapacityMinutes: minutes,
});

export const updatePlanSchema = createPlanSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'at least one field must be provided',
  });

export const enrollSubjectsSchema = z.object({
  subjects: z
    .array(
      z.object({
        subjectId: z.string().min(1),
        theoryMaxMarks: marks,
        practicalMaxMarks: marks,
        targetMarks: marks,
        boardExamDate: isoDate.nullable().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .min(1),
});

export const setCurriculumSchema = z.object({
  curriculumVersionId: z.string().min(1),
});
