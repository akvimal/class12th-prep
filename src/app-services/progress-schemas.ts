import { z } from 'zod';
import {
  CHAPTER_STATES,
  CONFIDENCE_LEVELS,
  INTEREST_LEVELS,
  SCHOOL_CHAPTER_STATUSES,
} from '@/domain/progress/chapter-progress';

const score = z.number().int().min(0).max(100).optional();
const timestamp = z.string().datetime().nullable().optional();

export const chapterProgressPatchSchema = z
  .object({
    state: z.enum(CHAPTER_STATES).optional(),
    confidence: z.enum(CONFIDENCE_LEVELS).nullable().optional(),
    interest: z.enum(INTEREST_LEVELS).nullable().optional(),
    schoolStatus: z.enum(SCHOOL_CHAPTER_STATUSES).optional(),
    conceptScore: score,
    practiceScore: score,
    testScore: score,
    recallScore: score,
    revisionScore: score,
    effectiveReadiness: z.number().min(0).max(100).nullable().optional(),
    lastStudiedAt: timestamp,
    lastRevisedAt: timestamp,
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'at least one field must be provided',
  });
