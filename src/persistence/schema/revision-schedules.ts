import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { chapters } from './curriculum';
import { revisionMethod, revisionOutcome, revisionStatus } from './enums';

/**
 * A spaced-revision occurrence for a chapter (docs/DOMAIN_MODEL.md
 * `RevisionSchedule`). Rows accumulate as history — completing one marks it
 * DONE and appends the next SCHEDULED row. At most one SCHEDULED row per
 * (academic year, chapter) at a time (partial unique index).
 */
export const revisionSchedules = pgTable(
  'revision_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    dueDate: date('due_date').notNull(),
    method: revisionMethod('method').notNull(),
    status: revisionStatus('status').notNull().default('SCHEDULED'),
    /** Set when the revision is completed. */
    outcome: revisionOutcome('outcome'),
    completedOn: date('completed_on'),
    /** The StudySession that recorded the outcome, once sessions link to it. */
    sourceSessionId: uuid('source_session_id'),
    algorithmVersion: text('algorithm_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('revision_schedules_one_active')
      .on(t.academicYearId, t.chapterId)
      .where(sql`${t.status} = 'SCHEDULED'`),
    check('revision_schedules_revision_number_positive', sql`${t.revisionNumber} >= 1`),
  ],
);

export type RevisionScheduleRow = typeof revisionSchedules.$inferSelect;
