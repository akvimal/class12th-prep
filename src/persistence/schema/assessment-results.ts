import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { assessments } from './assessments';
import { chapters, subjects } from './curriculum';
import { errorState, errorType } from './enums';

/**
 * The recorded outcome of an assessment (docs/DOMAIN_MODEL.md `AssessmentResult`).
 * One row per assessment; recording it marks the assessment COMPLETED. Immutable
 * evidence — corrections are new rows / error-state transitions, not edits.
 */
export const assessmentResults = pgTable(
  'assessment_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id')
      .notNull()
      .unique()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    maxMarks: integer('max_marks').notNull(),
    timeTakenMinutes: integer('time_taken_minutes'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('assessment_results_score_range', sql`${t.score} >= 0 and ${t.score} <= ${t.maxMarks}`),
  ],
);

/**
 * A specific mistake in an assessment (docs/DOMAIN_MODEL.md `QuestionError`),
 * with a state machine NEW → REVIEWED → CORRECTED → RETEST_DUE → MASTERED.
 */
export const questionErrors = pgTable(
  'question_errors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assessmentResultId: uuid('assessment_result_id')
      .notNull()
      .references(() => assessmentResults.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'restrict' }),
    marksLost: integer('marks_lost').notNull(),
    errorType: errorType('error_type').notNull(),
    state: errorState('state').notNull().default('NEW'),
    notes: text('notes'),
    retestDueDate: date('retest_due_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('question_errors_marks_lost_positive', sql`${t.marksLost} > 0`)],
);

export type AssessmentResultRow = typeof assessmentResults.$inferSelect;
export type QuestionErrorRow = typeof questionErrors.$inferSelect;
