import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { satDomain, satPrepPlanStatus } from './enums';
import { students } from './students';

/**
 * A real, dated SAT attempt and its section scores — immutable evidence, kept
 * independent of the CBSE curriculum/academic-year model (a competitive exam
 * has no board weightage and is not board master data).
 */
export const satAttempts = pgTable(
  'sat_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    testDate: date('test_date').notNull(),
    totalScore: integer('total_score').notNull(),
    readingWritingScore: integer('reading_writing_score').notNull(),
    mathScore: integer('math_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('sat_attempts_student_number_unique').on(t.studentId, t.attemptNumber),
    check('sat_attempts_attempt_number_positive', sql`${t.attemptNumber} >= 1`),
    check(
      'sat_attempts_scores_in_range',
      sql`${t.totalScore} between 400 and 1600
        and ${t.readingWritingScore} between 200 and 800
        and ${t.mathScore} between 200 and 800`,
    ),
  ],
);

/**
 * Per-domain performance band ("Knowledge and Skills") for one attempt —
 * the objective signal `rankDomainPriorities` ranks focus on.
 */
export const satDomainScores = pgTable(
  'sat_domain_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => satAttempts.id, { onDelete: 'cascade' }),
    domain: satDomain('domain').notNull(),
    performanceLow: integer('performance_low').notNull(),
    performanceHigh: integer('performance_high').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('sat_domain_scores_attempt_domain_unique').on(t.attemptId, t.domain),
    check(
      'sat_domain_scores_band_valid',
      sql`${t.performanceLow} >= 0 and ${t.performanceHigh} >= ${t.performanceLow}`,
    ),
  ],
);

/**
 * A time-boxed prep plan targeting one SAT attempt. At most one ACTIVE plan
 * per student (partial unique index) — mirrors `preparation_plans`.
 */
export const satPrepPlans = pgTable(
  'sat_prep_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    testDate: date('test_date').notNull(),
    startDate: date('start_date').notNull(),
    weeklyTargetMinutes: integer('weekly_target_minutes').notNull(),
    status: satPrepPlanStatus('status').notNull().default('ACTIVE'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('sat_prep_plans_one_active_per_student')
      .on(t.studentId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check('sat_prep_plans_dates_ordered', sql`${t.startDate} <= ${t.testDate}`),
    check('sat_prep_plans_weekly_target_non_negative', sql`${t.weeklyTargetMinutes} >= 0`),
  ],
);

/**
 * Immutable evidence of SAT prep work — analogous to `study_sessions`, but
 * scoped to a plan rather than a curriculum chapter.
 */
export const satPrepSessions = pgTable(
  'sat_prep_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => satPrepPlans.id, { onDelete: 'cascade' }),
    domain: satDomain('domain'),
    sessionDate: date('session_date').notNull(),
    actualMinutes: integer('actual_minutes').notNull(),
    fullPracticeTest: boolean('full_practice_test').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('sat_prep_sessions_actual_minutes_non_negative', sql`${t.actualMinutes} >= 0`)],
);

export type SatAttemptRow = typeof satAttempts.$inferSelect;
export type SatDomainScoreRow = typeof satDomainScores.$inferSelect;
export type SatPrepPlanRow = typeof satPrepPlans.$inferSelect;
export type SatPrepSessionRow = typeof satPrepSessions.$inferSelect;
