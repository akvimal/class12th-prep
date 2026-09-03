import type { VersionedConfig } from './index';

/**
 * Trajectory-risk configuration (docs/ALGORITHMS.md §9). Compares expected
 * weighted completion by date against the actual, and projects the finish date
 * at the current pace. Versioned so a raised risk is reproducible.
 */
export interface TrajectoryRiskConfig extends VersionedConfig {
  /** Actual weighted completion lagging the expected line by more than this → PLAN_AT_RISK (WATCH). */
  planLagWatch: number;
  /** Twice-as-bad lag → PLAN_AT_RISK (AT_RISK). */
  planLagAtRisk: number;
  /** Don't assess risk until this fraction of the plan window has elapsed (avoids day-one noise). */
  minElapsedFraction: number;
  /** Buffer subtracted from the hard completion date when checking the projected finish. */
  hardDeadlineBufferDays: number;
}

export const trajectoryRiskV1: TrajectoryRiskConfig = {
  version: 'trajectory-risk-v1',
  planLagWatch: 0.12,
  planLagAtRisk: 0.22,
  minElapsedFraction: 0.1,
  hardDeadlineBufferDays: 7,
};
