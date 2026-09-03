import type { VersionedConfig } from './index';

/**
 * Plan-pressure configuration (docs/ALGORITHMS.md §8). Turns "how much work is
 * left vs. how much time is left" into a band with explanatory drivers.
 * Versioned so a reported pressure is reproducible.
 */
export interface PlanPressureConfig extends VersionedConfig {
  /** Minutes of work implied by one board-weight point at 100% readiness gap. */
  minutesPerWeightGapPoint: number;
  /** Board weight assumed for a chapter that has none. */
  neutralChapterWeight: number;
  /** Minutes budgeted per scheduled revision due before the syllabus target. */
  revisionMinutes: number;
  /** Minutes budgeted to prepare for each upcoming school assessment. */
  assessmentPrepMinutes: number;
  /**
   * demand ÷ capacity thresholds. ≤ low → LOW, ≤ normal → NORMAL,
   * ≤ high → HIGH, else CRITICAL.
   */
  bands: { low: number; normal: number; high: number };
}

export const planPressureV1: PlanPressureConfig = {
  version: 'plan-pressure-v1',
  minutesPerWeightGapPoint: 9,
  neutralChapterWeight: 5,
  revisionMinutes: 25,
  assessmentPrepMinutes: 60,
  bands: { low: 0.7, normal: 0.95, high: 1.15 },
};
