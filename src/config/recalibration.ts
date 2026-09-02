import type { AssessmentType } from '@/domain/assessment/assessment';
import type { VersionedConfig } from './index';

/**
 * Assessment recalibration configuration (docs/ALGORITHMS.md §10). Versioned —
 * a chapter's readiness snapshot after recalibration records `readiness-v1`,
 * but the component evidence that fed it was shaped by this config; keep it
 * versioned so a re-run is reproducible.
 *
 * The model never replaces readiness with the test percentage. It nudges the
 * relevant *component* scores toward what the result observed, with an EWMA
 * weight that scales with how much the assessment type is trusted: a pre-board
 * moves the needle far more than a class test.
 */
export interface RecalibrationConfig extends VersionedConfig {
  /**
   * EWMA weight `w` — `new = old·(1−w) + observed·w` — per assessment type.
   * `default` covers any type not listed.
   */
  evidenceWeight: Partial<Record<AssessmentType, number>> & { default: number };
  /**
   * How far a chapter's marks lost (as a fraction of the test's max) drags its
   * observed test performance below the overall percentage.
   */
  lossSpread: number;
  /**
   * Extra drag on the observed concept / recall score per unit of
   * knowledge-gap marks lost (as a fraction of the test's max).
   */
  gapPenalty: number;
}

export const recalibrationV1: RecalibrationConfig = {
  version: 'recalibration-v1',
  evidenceWeight: {
    PREBOARD: 0.6,
    FULL_MOCK: 0.55,
    SCHOOL_HALF_YEARLY: 0.45,
    SCHOOL_UNIT_TEST: 0.35,
    SAMPLE_PAPER: 0.35,
    PYQ: 0.3,
    SCHOOL_CLASS_TEST: 0.25,
    SELF_TEST: 0.2,
    default: 0.3,
  },
  lossSpread: 1.0,
  gapPenalty: 1.5,
};
