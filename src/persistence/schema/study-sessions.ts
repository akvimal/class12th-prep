import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { chapters, subjects } from './curriculum';
import { confidenceLevel, sessionCompletion, studySessionType } from './enums';

/**
 * Immutable evidence of actual study/practice/revision work
 * (docs/DOMAIN_MODEL.md `StudySession`). Only `created_at` — a session is not
 * edited after the fact.
 *
 * `studyTaskId` links to a planned task once the planner exists (TASK-011);
 * no foreign key yet. `chapterId` implies `subjectId` (CHECK); a whole-paper
 * session may carry a subject but no chapter, or neither.
 */
export const studySessions = pgTable(
  'study_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'restrict' }),
    chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'restrict' }),
    studyTaskId: uuid('study_task_id'),

    type: studySessionType('type').notNull(),
    completion: sessionCompletion('completion').notNull(),
    sessionDate: date('session_date').notNull(),

    plannedMinutes: integer('planned_minutes'),
    actualMinutes: integer('actual_minutes').notNull(),
    attempted: integer('attempted'),
    correct: integer('correct'),
    confidenceAfter: confidenceLevel('confidence_after'),

    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('study_sessions_year_date_idx').on(t.academicYearId, t.sessionDate),
    check('study_sessions_actual_minutes_non_negative', sql`${t.actualMinutes} >= 0`),
    check(
      'study_sessions_planned_minutes_non_negative',
      sql`${t.plannedMinutes} is null or ${t.plannedMinutes} >= 0`,
    ),
    check(
      'study_sessions_attempted_non_negative',
      sql`${t.attempted} is null or ${t.attempted} >= 0`,
    ),
    check(
      'study_sessions_correct_valid',
      sql`${t.correct} is null
        or (${t.correct} >= 0 and (${t.attempted} is null or ${t.correct} <= ${t.attempted}))`,
    ),
    check(
      'study_sessions_chapter_implies_subject',
      sql`${t.chapterId} is null or ${t.subjectId} is not null`,
    ),
    check(
      'study_sessions_times_ordered',
      sql`${t.startedAt} is null or ${t.endedAt} is null or ${t.endedAt} >= ${t.startedAt}`,
    ),
  ],
);

export type StudySessionRow = typeof studySessions.$inferSelect;
