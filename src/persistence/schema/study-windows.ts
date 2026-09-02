import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, time, timestamp, uuid } from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { studyWindowDayType } from './enums';

/**
 * A recurring intended study window (docs/SRS.md §14 Phase 2). Drives reminders
 * and the adherence metric; never creates tasks. `reminder_enabled` toggles the
 * nudge for this window only.
 */
export const studyWindows = pgTable(
  'study_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    dayType: studyWindowDayType('day_type').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    label: text('label'),
    enabled: boolean('enabled').notNull().default(true),
    reminderEnabled: boolean('reminder_enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('study_windows_time_ordered', sql`${t.endTime} > ${t.startTime}`)],
);

export type StudyWindowRow = typeof studyWindows.$inferSelect;
