import type { AssessmentType } from '@/domain/assessment/assessment';
import type { VersionedConfig } from './index';

/**
 * Projected-score configuration (docs/ALGORITHMS.md §11). A planning estimate,
 * not a prediction — deliberately conservative and only surfaced once there is
 * enough evidence. Versioned so a shown projection is reproducible.
 */
export interface ProjectionConfig extends VersionedConfig {
  /** Weighted chapter coverage (Σ weight with a readiness signal ÷ Σ weight) required to show a projection. */
  minCoverage: number;
  /** Graded assessments in the subject required to show a projection. */
  minAssessments: number;
  /** Board weight used for a chapter that has none. */
  neutralChapterWeight: number;
  /** Blend of the two signals; must sum to 1. */
  readinessWeight: number;
  assessmentWeight: number;
  /** Trust in each assessment type as score evidence. `default` covers the rest. */
  assessmentTypeWeight: Partial<Record<AssessmentType, number>> & { default: number };
  /**
   * Conservative shrink applied to the blended estimate when evidence is at the
   * minimum bar; scales linearly to 1.0 as evidence approaches "full"
   * (2× the minimums). Keeps a thin projection from over-promising.
   */
  conservatismAtMinEvidence: number;
  /** Hard ceiling on any projected score (%). */
  projectionCeiling: number;
}

export const projectionV1: ProjectionConfig = {
  version: 'projection-v1',
  minCoverage: 0.6,
  minAssessments: 1,
  neutralChapterWeight: 5,
  readinessWeight: 0.7,
  assessmentWeight: 0.3,
  assessmentTypeWeight: {
    PREBOARD: 1.0,
    FULL_MOCK: 0.9,
    SCHOOL_HALF_YEARLY: 0.7,
    SAMPLE_PAPER: 0.6,
    PYQ: 0.55,
    SCHOOL_UNIT_TEST: 0.5,
    SCHOOL_CLASS_TEST: 0.35,
    SELF_TEST: 0.3,
    default: 0.4,
  },
  conservatismAtMinEvidence: 0.9,
  projectionCeiling: 95,
};
