import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { chapters, subjects } from './curriculum';
import { studySessionType, studyTaskSlot, studyTaskStatus } from './enums';

/**
 * A planned academic action for one day (docs/DOMAIN_MODEL.md `StudyTask`).
 * The daily planner regenerates the day's set on every look; a study session
 * resolves a task COMPLETED; a task whose day has passed with no matching
 * session becomes MISSED and its chapter's missed count feeds the priority
 * backlog factor (docs/ALGORITHMS.md §6).
 *
 * At most one SCHEDULED row per (academic year, chapter, day) — regeneration
 * cancels the rows it no longer proposes and upserts the rest.
 */
export const studyTasks = pgTable(
  'study_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),

    plannedDate: date('planned_date').notNull(),
    activity: studySessionType('activity').notNull(),
    plannedMinutes: integer('planned_minutes').notNull(),
    slot: studyTaskSlot('slot').notNull(),
    reasonCodes: text('reason_codes')
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** Normalised priority score at planning time (evidence, not recomputed). */
    priorityScore: real('priority_score'),

    status: studyTaskStatus('status').notNull().default('SCHEDULED'),
    /** The session that completed the task, once one does. */
    sourceSessionId: uuid('source_session_id'),
    algorithmVersion: text('algorithm_version'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** When the task left SCHEDULED. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('study_tasks_one_open')
      .on(t.academicYearId, t.chapterId, t.plannedDate)
      .where(sql`${t.status} = 'SCHEDULED'`),
    index('study_tasks_year_date_idx').on(t.academicYearId, t.plannedDate),
    check('study_tasks_planned_minutes_non_negative', sql`${t.plannedMinutes} >= 0`),
  ],
);

export type StudyTaskRow = typeof studyTasks.$inferSelect;
