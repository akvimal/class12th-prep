import type { TrajectoryRiskConfig } from '@/config/trajectory-risk';
import { addDays, daysBetween } from './dates';

export const TRAJECTORY_RISK_TYPES = ['PLAN_AT_RISK', 'SYLLABUS_TARGET_AT_RISK'] as const;
export type TrajectoryRiskType = (typeof TRAJECTORY_RISK_TYPES)[number];

export type TrajectoryRiskSeverity = 'WATCH' | 'AT_RISK';

export interface TrajectoryRiskInput {
  planStart: string;
  syllabusTarget: string;
  hardCompletion: string;
  asOf: string;
  /** Weighted completion so far, 0..1 (Σ weight·readiness/100 ÷ Σ weight). */
  actualWeightedCompletion: number;
}

export interface TrajectoryRisk {
  type: TrajectoryRiskType;
  severity: TrajectoryRiskSeverity;
  expectedCompletion: number;
  actualCompletion: number;
  /** expected − actual, 0..1. */
  lag: number;
  /** Extrapolated date the syllabus reaches 100% at the current average pace; null when stalled. */
  projectedFinish: string | null;
  drivers: string[];
  algorithmVersion: string;
}

function pct(v: number): number {
  return Math.round(v * 100);
}

/**
 * Detect plan / syllabus-target risk (docs/ALGORITHMS.md §9). Deterministic.
 * Returns an empty list while it's too early in the plan to tell. The syllabus
 * risk is raised as soon as the projected finish crosses the hard deadline
 * (minus a buffer) — i.e. before the deadline, while there is still time to act.
 */
export function assessTrajectoryRisk(
  input: TrajectoryRiskInput,
  config: TrajectoryRiskConfig,
): TrajectoryRisk[] {
  const windowDays = Math.max(1, daysBetween(input.planStart, input.syllabusTarget));
  const elapsedDays = Math.max(0, daysBetween(input.planStart, input.asOf));
  const elapsedFraction = Math.min(1, elapsedDays / windowDays);
  if (elapsedFraction < config.minElapsedFraction) return [];

  const actual = Math.max(0, Math.min(1, input.actualWeightedCompletion));
  const expected = elapsedFraction; // linear ramp to 100% by the syllabus target
  const lag = Math.max(0, expected - actual);

  // Average pace since the plan started, and the finish date it implies.
  const pacePerDay = elapsedDays > 0 ? actual / elapsedDays : 0;
  const remaining = 1 - actual;
  const projectedFinish =
    pacePerDay > 0 ? addDays(input.asOf, Math.ceil(remaining / pacePerDay)) : null;

  const risks: TrajectoryRisk[] = [];

  if (lag >= config.planLagWatch) {
    const severity: TrajectoryRiskSeverity = lag >= config.planLagAtRisk ? 'AT_RISK' : 'WATCH';
    risks.push({
      type: 'PLAN_AT_RISK',
      severity,
      expectedCompletion: actual + lag,
      actualCompletion: actual,
      lag,
      projectedFinish,
      drivers: [
        `${pct(actual)}% covered vs. ~${pct(expected)}% expected by now`,
        `${pct(lag)} points behind the plan line`,
      ],
      algorithmVersion: config.version,
    });
  }

  const deadline = addDays(input.hardCompletion, -config.hardDeadlineBufferDays);
  const targetAtRisk =
    input.asOf < input.hardCompletion && (projectedFinish === null || projectedFinish > deadline);
  if (targetAtRisk) {
    risks.push({
      type: 'SYLLABUS_TARGET_AT_RISK',
      severity:
        projectedFinish === null || projectedFinish > input.hardCompletion ? 'AT_RISK' : 'WATCH',
      expectedCompletion: expected,
      actualCompletion: actual,
      lag,
      projectedFinish,
      drivers: [
        projectedFinish === null
          ? 'no measurable progress yet — finish date cannot be projected'
          : `at the current pace the syllabus finishes ${projectedFinish}, past the ${deadline} buffer`,
      ],
      algorithmVersion: config.version,
    });
  }

  return risks;
}
