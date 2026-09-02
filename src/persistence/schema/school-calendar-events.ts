import { sql } from 'drizzle-orm';
import { check, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { academicYears } from './academic-years';

export const schoolEventType = pgEnum('school_event_type', [
  'NORMAL_SCHOOL_DAY',
  'HOLIDAY',
  'STUDY_LEAVE',
  'EXAM_DAY',
  'PRACTICAL_DAY',
  'VACATION',
  'UNAVAILABLE',
]);

/**
 * School days, holidays, study leave, exam/practical days and unavailable
 * dates (docs/DOMAIN_MODEL.md `SchoolCalendarEvent`, docs/SRS.md §8).
 *
 * Dates are stored as plain dates and interpreted in the student's timezone by
 * the caller. `capacityOverride` (minutes) beats the type's configured default.
 * An event changes available capacity — it never creates study tasks.
 */
export const schoolCalendarEvents = pgTable(
  'school_calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    type: schoolEventType('type').notNull(),
    title: text('title'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    capacityOverride: integer('capacity_override'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    check('school_calendar_events_dates_ordered', sql`${t.startDate} <= ${t.endDate}`),
    check(
      'school_calendar_events_capacity_non_negative',
      sql`${t.capacityOverride} is null or ${t.capacityOverride} >= 0`,
    ),
  ],
);

export type SchoolCalendarEventRow = typeof schoolCalendarEvents.$inferSelect;
