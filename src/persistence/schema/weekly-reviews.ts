import { date, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';

/**
 * A stored, generated summary of one study week (docs/DOMAIN_MODEL.md
 * `WeeklyReview`) — kept for audit and week-over-week comparison. Regenerating
 * a week overwrites its row (the summary is a pure function of evidence +
 * config version). At most one row per (academic year, week start).
 */
export const weeklyReviews = pgTable(
  'weekly_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    weekEnd: date('week_end').notNull(),
    /** The full `WeeklyReview` domain object. */
    summary: jsonb('summary').notNull(),
    algorithmVersion: text('algorithm_version').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('weekly_reviews_one_per_week').on(t.academicYearId, t.weekStart)],
);

export type WeeklyReviewRow = typeof weeklyReviews.$inferSelect;
