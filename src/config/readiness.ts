import type { VersionedConfig } from './index';

/**
 * Readiness calculation configuration (docs/ALGORITHMS.md §1). Versioned —
 * every ReadinessSnapshot records which version produced it, so historical
 * snapshots stay interpretable after the weights change.
 */
export interface ReadinessConfig extends VersionedConfig {
  /** Component weights. Should sum to 1. */
  weights: {
    conceptScore: number;
    practiceScore: number;
    testScore: number;
    recallScore: number;
    revisionScore: number;
  };
  /**
   * Recency decay applied to `raw` based on days since the last successful
   * revision. First band whose `maxDays` is >= the day count wins.
   */
  recencyBands: ReadonlyArray<{ maxDays: number; factor: number }>;
  /**
   * Factor used when the chapter has never been revised. 1 — no extra decay,
   * because `raw` already reflects a revision score of 0.
   */
  neverRevisedFactor: number;
}

export const readinessV1: ReadinessConfig = {
  version: 'readiness-v1',
  weights: {
    conceptScore: 0.2,
    practiceScore: 0.25,
    testScore: 0.3,
    recallScore: 0.15,
    revisionScore: 0.1,
  },
  recencyBands: [
    { maxDays: 6, factor: 1.0 }, // < 7 days
    { maxDays: 14, factor: 0.97 }, // 7–14
    { maxDays: 30, factor: 0.92 }, // 15–30
    { maxDays: 45, factor: 0.85 }, // 31–45
    { maxDays: Number.POSITIVE_INFINITY, factor: 0.75 }, // > 45
  ],
  neverRevisedFactor: 1.0,
};
