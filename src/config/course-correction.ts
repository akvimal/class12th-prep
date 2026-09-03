import type { VersionedConfig } from './index';

/**
 * Course-correction configuration (docs/ALGORITHMS.md §8, build-plan Phase 5).
 * The generator proposes 2–3 concrete plan diffs when the plan is under
 * pressure; nothing is applied without an explicit accept.
 */
export interface CourseCorrectionConfig extends VersionedConfig {
  /** Only propose corrections at or above this pressure band. */
  triggerBands: string[];
  /** Days the reprioritise proposal pins the weakest chapters to the top. */
  reprioritiseDays: number;
  /** Candidate weekday-minute increases to offer. */
  capacityStepsMinutes: number[];
  /** Cap on how many days the "move target" proposal will suggest. */
  maxTargetShiftDays: number;
  /** Rough projected-point gain per hour/week of added study, for the effect estimate. */
  projectedPointsPerAddedHourPerWeek: number;
}

export const courseCorrectionV1: CourseCorrectionConfig = {
  version: 'course-correction-v1',
  triggerBands: ['HIGH', 'CRITICAL'],
  reprioritiseDays: 10,
  capacityStepsMinutes: [20, 30, 45],
  maxTargetShiftDays: 14,
  projectedPointsPerAddedHourPerWeek: 1.6,
};
