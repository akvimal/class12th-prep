import { sql } from 'drizzle-orm';
import {
  check,
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { readinessScopeType } from './enums';

/**
 * Immutable calculated evidence (docs/DOMAIN_MODEL.md `ReadinessSnapshot`).
 * Every calculation appends a row; nothing is ever updated. The
 * `algorithmVersion` makes an old snapshot interpretable after the config
 * changes.
 *
 * `scopeId` is polymorphic (a chapter / subject / academic-year id) and has no
 * foreign key — a snapshot is historical evidence and outlives its scope.
 */
export const readinessSnapshots = pgTable(
  'readiness_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    scopeType: readinessScopeType('scope_type').notNull(),
    scopeId: uuid('scope_id').notNull(),

    /** Effective readiness, 0..100. */
    readiness: doublePrecision('readiness').notNull(),
    /** Weighted-sum before recency decay, 0..100. */
    raw: doublePrecision('raw').notNull(),
    recencyFactor: doublePrecision('recency_factor').notNull(),
    /** The component scores that produced this snapshot. */
    componentJson: jsonb('component_json').notNull(),

    algorithmVersion: text('algorithm_version').notNull(),
    /** The date the readiness was evaluated for. */
    calculatedFor: date('calculated_for').notNull(),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('readiness_snapshots_scope_idx').on(
      t.academicYearId,
      t.scopeType,
      t.scopeId,
      t.calculatedAt,
    ),
    check(
      'readiness_snapshots_readiness_in_range',
      sql`${t.readiness} >= 0 and ${t.readiness} <= 100`,
    ),
    check('readiness_snapshots_raw_in_range', sql`${t.raw} >= 0 and ${t.raw} <= 100`),
    check('readiness_snapshots_recency_positive', sql`${t.recencyFactor} > 0`),
  ],
);

export type ReadinessSnapshotRow = typeof readinessSnapshots.$inferSelect;
