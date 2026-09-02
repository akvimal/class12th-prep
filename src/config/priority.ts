import type { VersionedConfig } from './index';

/**
 * Priority scoring configuration (docs/ALGORITHMS.md §3). Versioned — a task's
 * candidate score is only interpretable against the config version that
 * produced it.
 *
 *   raw = weakness · revisionDue · schoolUrgency · importance · backlog
 *
 * `prioritize()` then normalises raw scores across the candidate set.
 */
export interface PriorityConfig extends VersionedConfig {
  /**
   * `weakness` scales linearly with (100 − effectiveReadiness): a chapter at
   * readiness 0 gets `atZeroReadiness`, one at 100 gets `atFullReadiness`.
   */
  weakness: { atZeroReadiness: number; atFullReadiness: number };
  /** Multiplier by spaced-revision state. */
  revisionDue: { none: number; dueToday: number; overdue: number };
  /**
   * School-test urgency by days until the nearest test that covers the chapter.
   * First band whose `maxDays` is >= the day count wins; past / no test → 1.
   * Defaults from docs/ALGORITHMS.md §3.
   */
  schoolUrgencyBands: ReadonlyArray<{ maxDays: number; factor: number }>;
  /**
   * Board / exam importance from the chapter's weight. `importance =
   * base + perWeightPoint · weight`, using `neutralWeight` when the chapter has
   * no weight. Weight here is the RELATIVE 1–10 estimate in the curriculum.
   */
  importance: { base: number; perWeightPoint: number; neutralWeight: number };
  /**
   * Backlog pressure: a task returned to the queue N times gets
   * `1 + min(max, perMiss · N)`. Never lets stale work be starved forever, but
   * capped so it can't dominate.
   */
  backlog: { perMiss: number; max: number };
}

export const priorityV1: PriorityConfig = {
  version: 'priority-v1',
  weakness: { atZeroReadiness: 2.2, atFullReadiness: 0.5 },
  revisionDue: { none: 1.0, dueToday: 1.15, overdue: 1.35 },
  schoolUrgencyBands: [
    { maxDays: 1, factor: 1.8 }, // today / tomorrow
    { maxDays: 3, factor: 1.5 },
    { maxDays: 7, factor: 1.25 },
    { maxDays: 14, factor: 1.1 },
  ],
  importance: { base: 0.7, perWeightPoint: 0.05, neutralWeight: 5 },
  backlog: { perMiss: 0.15, max: 0.6 },
};
