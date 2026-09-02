import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { academicYears } from './academic-years';
import { chapters } from './curriculum';
import { chapterState, confidenceLevel, interestLevel, schoolChapterStatus } from './enums';

/**
 * Student-specific progress on one curriculum chapter, for one academic year
 * (docs/DOMAIN_MODEL.md `ChapterProgress`). Kept entirely separate from the
 * curriculum master data — two students working the same chapter have two
 * independent rows, and the `chapters` row is never touched.
 *
 * `state` may move backward when contradictory evidence arrives — not enforced
 * here. `effectiveReadiness` is computed by the readiness engine (TASK-009) and
 * left null until then.
 */
export const chapterProgress = pgTable(
  'chapter_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'restrict' }),

    state: chapterState('state').notNull().default('NOT_STARTED'),
    confidence: confidenceLevel('confidence'),
    interest: interestLevel('interest'),
    schoolStatus: schoolChapterStatus('school_status').notNull().default('NOT_TAUGHT'),

    conceptScore: integer('concept_score').notNull().default(0),
    practiceScore: integer('practice_score').notNull().default(0),
    testScore: integer('test_score').notNull().default(0),
    recallScore: integer('recall_score').notNull().default(0),
    revisionScore: integer('revision_score').notNull().default(0),

    effectiveReadiness: doublePrecision('effective_readiness'),
    lastStudiedAt: timestamp('last_studied_at', { withTimezone: true }),
    lastRevisedAt: timestamp('last_revised_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('chapter_progress_year_chapter_unique').on(t.academicYearId, t.chapterId),
    check(
      'chapter_progress_scores_in_range',
      sql`${t.conceptScore} between 0 and 100
        and ${t.practiceScore} between 0 and 100
        and ${t.testScore} between 0 and 100
        and ${t.recallScore} between 0 and 100
        and ${t.revisionScore} between 0 and 100`,
    ),
    check(
      'chapter_progress_readiness_in_range',
      sql`${t.effectiveReadiness} is null or (${t.effectiveReadiness} >= 0 and ${t.effectiveReadiness} <= 100)`,
    ),
  ],
);

export type ChapterProgressRow = typeof chapterProgress.$inferSelect;
