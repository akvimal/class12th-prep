import type { VersionedConfig } from './index';

/**
 * Configuration for deriving the six semantic plan phases from a plan's
 * configured dates (docs/SRS.md §5, docs/ALGORITHMS.md). Versioned — a phase's
 * stored `config_json` records which version produced it.
 */
export interface PlanPhaseConfig extends VersionedConfig {
  /**
   * Length of an optional ramp-up FOUNDATION phase at the very start.
   * 0 (default) means no distinct foundation phase.
   */
  foundationDays: number;
  /**
   * How many days before the exam window the PREBOARD phase begins. Clamped so
   * it never starts before REVISION.
   */
  preboardLeadDays: number;
}

export const phasesV1: PlanPhaseConfig = {
  version: 'phases-v1',
  foundationDays: 0,
  preboardLeadDays: 14,
};
