import { z } from 'zod';
import { ASSESSMENT_TYPES } from '@/domain/assessment/assessment';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const addAssessmentSchema = z.object({
  type: z.enum(ASSESSMENT_TYPES),
  name: z.string().min(1),
  examDate: isoDate,
  maxMarks: z.number().int().positive().nullable().optional(),
  subjectKey: z.string().min(1),
  chapterKeys: z.array(z.string().min(1)).min(1),
});
