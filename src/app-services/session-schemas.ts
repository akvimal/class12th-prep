import { z } from 'zod';
import { CONFIDENCE_LEVELS } from '@/domain/progress/chapter-progress';
import { SESSION_COMPLETIONS, STUDY_SESSION_TYPES } from '@/domain/progress/study-session';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const count = z.number().int().min(0).nullable().optional();

export const recordSessionSchema = z.object({
  type: z.enum(STUDY_SESSION_TYPES),
  completion: z.enum(SESSION_COMPLETIONS),
  chapterKey: z.string().min(1).optional(),
  chapterId: z.string().min(1).optional(),
  subjectKey: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  studyTaskId: z.string().min(1).nullable().optional(),
  sessionDate: isoDate.optional(),
  plannedMinutes: count,
  actualMinutes: z.number().int().min(0),
  attempted: count,
  correct: count,
  confidenceAfter: z.enum(CONFIDENCE_LEVELS).nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
});
