import type { ReadinessConfig } from '@/config/readiness';
import { daysBetween } from '@/domain/planning/dates';

/**
 * Deterministic readiness calculation (docs/ALGORITHMS.md §1).
 *
 *   raw       = Σ component · weight            (each component 0..100)
 *   effective = raw · recency_factor           (clamped to 0..100)
 *
 * Confidence is deliberately not an input — it informs planning but never
 * readiness (SRS §4). Same components + config + dates always give the same
 * result.
 */

export interface ReadinessComponents {
  conceptScore: number;
  practiceScore: number;
  testScore: number;
  recallScore: number;
  revisionScore: number;
}

export interface ReadinessInput extends ReadinessComponents {
  /** ISO date of the last successful revision, or null if never revised. */
  lastRevisedOn: string | null;
  /** The date the readiness is evaluated for (ISO). */
  asOf: string;
}

export interface ReadinessResult {
  raw: number;
  recencyFactor: number;
  effective: number;
  daysSinceRevision: number | null;
  algorithmVersion: string;
  components: ReadinessComponents;
}

const COMPONENT_KEYS: (keyof ReadinessComponents)[] = [
  'conceptScore',
  'practiceScore',
  'testScore',
  'recallScore',
  'revisionScore',
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp0to100(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function recencyFactor(daysSince: number | null, config: ReadinessConfig): number {
  if (daysSince === null) return config.neverRevisedFactor;
  for (const band of config.recencyBands) {
    if (daysSince <= band.maxDays) return band.factor;
  }
  return config.recencyBands[config.recencyBands.length - 1]?.factor ?? 1;
}

export function computeReadiness(input: ReadinessInput, config: ReadinessConfig): ReadinessResult {
  const components: ReadinessComponents = {
    conceptScore: input.conceptScore,
    practiceScore: input.practiceScore,
    testScore: input.testScore,
    recallScore: input.recallScore,
    revisionScore: input.revisionScore,
  };

  const raw = clamp0to100(
    COMPONENT_KEYS.reduce((sum, key) => sum + components[key] * config.weights[key], 0),
  );

  const daysSinceRevision =
    input.lastRevisedOn === null ? null : Math.max(0, daysBetween(input.lastRevisedOn, input.asOf));

  const factor = recencyFactor(daysSinceRevision, config);
  const effective = clamp0to100(raw * factor);

  return {
    raw: round2(raw),
    recencyFactor: factor,
    effective: round2(effective),
    daysSinceRevision,
    algorithmVersion: config.version,
    components,
  };
}
