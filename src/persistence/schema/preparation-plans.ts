import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  jsonb,
  pgTable,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { academicYears } from './academic-years';
import { phaseType, planStatus } from './enums';

/**
 * The single plan that spans both school and board preparation
 * (docs/SRS.md §5). Every date is configurable; there are no month-specific
 * columns. The date ordering is enforced by a CHECK constraint here and by
 * `validatePlanDateOrder` in src/domain/planning before persistence.
 *
 * Exactly one plan per academic year may be ACTIVE at a time — enforced by a
 * partial unique index (docs/DOMAIN_MODEL.md invariant 7).
 */
export const preparationPlans = pgTable(
  'preparation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    status: planStatus('status').notNull().default('DRAFT'),

    startDate: date('start_date').notNull(),
    syllabusTargetDate: date('syllabus_target_date').notNull(),
    hardCompletionDate: date('hard_completion_date').notNull(),
    revisionStartDate: date('revision_start_date').notNull(),
    examWindowStart: date('exam_window_start').notNull(),
    examWindowEnd: date('exam_window_end').notNull(),

    weekdayCapacityMinutes: integer('weekday_capacity_minutes').notNull(),
    weekendCapacityMinutes: integer('weekend_capacity_minutes').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('preparation_plans_one_active_per_year')
      .on(t.academicYearId)
      .where(sql`${t.status} = 'ACTIVE'`),
    check(
      'preparation_plans_dates_ordered',
      sql`${t.startDate} <= ${t.syllabusTargetDate}
        and ${t.syllabusTargetDate} <= ${t.hardCompletionDate}
        and ${t.hardCompletionDate} <= ${t.revisionStartDate}
        and ${t.revisionStartDate} <= ${t.examWindowStart}
        and ${t.examWindowStart} <= ${t.examWindowEnd}`,
    ),
    check(
      'preparation_plans_capacity_non_negative',
      sql`${t.weekdayCapacityMinutes} >= 0 and ${t.weekendCapacityMinutes} >= 0`,
    ),
  ],
);

/**
 * Semantic, date-driven phases (docs/SRS.md §5, docs/DOMAIN_MODEL.md).
 * Rows are populated and resolved in TASK-004; this table only defines the shape.
 */
export const planPhases = pgTable(
  'plan_phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    preparationPlanId: uuid('preparation_plan_id')
      .notNull()
      .references(() => preparationPlans.id, { onDelete: 'cascade' }),
    phaseType: phaseType('phase_type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    configJson: jsonb('config_json').notNull().default({}),
    ...timestamps,
  },
  (t) => [
    unique('plan_phases_plan_type_unique').on(t.preparationPlanId, t.phaseType),
    check('plan_phases_dates_ordered', sql`${t.startDate} <= ${t.endDate}`),
  ],
);

export type PreparationPlan = typeof preparationPlans.$inferSelect;
export type NewPreparationPlanRow = typeof preparationPlans.$inferInsert;
export type PlanPhase = typeof planPhases.$inferSelect;
export type NewPlanPhaseRow = typeof planPhases.$inferInsert;
