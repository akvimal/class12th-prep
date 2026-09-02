import type { ProjectionConfig } from '@/config/projection';
import type { AssessmentType } from '@/domain/assessment/assessment';

export interface ProjectionChapter {
  chapterId: string;
  boardWeight: number | null;
  /** 0..100, or null when the chapter has no readiness signal yet. */
  effectiveReadiness: number | null;
}

export interface ProjectionAssessment {
  type: AssessmentType;
  /** Score as a percentage, 0..100. */
  scorePct: number;
}

export interface SubjectProjectionInput {
  subjectKey: string;
  /** Target score as a percentage, 0..100, or null when none is set. */
  targetPct: number | null;
  chapters: ProjectionChapter[];
  /** Graded results for this subject. */
  assessments: ProjectionAssessment[];
}

export interface SubjectProjection {
  subjectKey: string;
  /** null until evidence is sufficient. */
  projectedPct: number | null;
  sufficientEvidence: boolean;
  /** Weighted fraction of the subject's chapters that carry a readiness signal. */
  coverage: number;
  assessmentsCounted: number;
  weightedReadiness: number | null;
  assessmentAverage: number | null;
  /** max(0, target − projected), or null. */
  marksOpportunityPct: number | null;
  drivers: string[];
  algorithmVersion: string;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * A conservative, deterministic projected score for one subject
 * (docs/ALGORITHMS.md §11). Blends weighted chapter readiness with graded
 * assessment evidence, shrinks the result while evidence is thin, and returns
 * `null` until both the coverage and assessment-count bars are cleared.
 */
export function projectSubjectScore(
  input: SubjectProjectionInput,
  config: ProjectionConfig,
): SubjectProjection {
  const weightOf = (c: ProjectionChapter) => c.boardWeight ?? config.neutralChapterWeight;
  const totalWeight = input.chapters.reduce((s, c) => s + weightOf(c), 0);
  const signalWeight = input.chapters
    .filter((c) => c.effectiveReadiness != null)
    .reduce((s, c) => s + weightOf(c), 0);
  const coverage = totalWeight > 0 ? signalWeight / totalWeight : 0;

  const weightedReadiness =
    signalWeight > 0
      ? input.chapters
          .filter((c) => c.effectiveReadiness != null)
          .reduce((s, c) => s + c.effectiveReadiness! * weightOf(c), 0) / signalWeight
      : null;

  let assessmentAverage: number | null = null;
  if (input.assessments.length > 0) {
    let num = 0;
    let den = 0;
    for (const a of input.assessments) {
      const w = config.assessmentTypeWeight[a.type] ?? config.assessmentTypeWeight.default;
      num += a.scorePct * w;
      den += w;
    }
    assessmentAverage = den > 0 ? num / den : null;
  }

  const drivers: string[] = [];
  let projectedPct: number | null = null;

  const sufficientEvidence =
    coverage >= config.minCoverage && input.assessments.length >= config.minAssessments;

  if (weightedReadiness != null) {
    const blended =
      assessmentAverage != null
        ? config.readinessWeight * weightedReadiness + config.assessmentWeight * assessmentAverage
        : weightedReadiness;

    // Evidence strength: 0 at the minimum bar, 1 at 2× the minimums.
    const covStrength = clamp01((coverage - config.minCoverage) / config.minCoverage);
    const assessStrength = clamp01(
      (input.assessments.length - config.minAssessments) / Math.max(1, config.minAssessments),
    );
    const strength = Math.min(covStrength, assessStrength);
    const shrink =
      config.conservatismAtMinEvidence + (1 - config.conservatismAtMinEvidence) * strength;

    projectedPct = round1(Math.min(config.projectionCeiling, blended * shrink));

    drivers.push(
      `readiness ${round1(weightedReadiness)}% (weighted, ${Math.round(coverage * 100)}% covered)`,
    );
    if (assessmentAverage != null) {
      drivers.push(`${input.assessments.length} graded test(s) avg ${round1(assessmentAverage)}%`);
    }
    if (shrink < 1) drivers.push(`held ${Math.round((1 - shrink) * 100)}% back — thin evidence`);
  }

  if (!sufficientEvidence) {
    drivers.unshift(
      coverage < config.minCoverage
        ? `only ${Math.round(coverage * 100)}% of the syllabus has a readiness signal`
        : `needs ${config.minAssessments} graded test(s), has ${input.assessments.length}`,
    );
  }

  const shownProjection = sufficientEvidence ? projectedPct : null;
  const marksOpportunityPct =
    input.targetPct != null && shownProjection != null
      ? Math.max(0, round1(input.targetPct - shownProjection))
      : null;

  return {
    subjectKey: input.subjectKey,
    projectedPct: shownProjection,
    sufficientEvidence,
    coverage: round1(coverage),
    assessmentsCounted: input.assessments.length,
    weightedReadiness: weightedReadiness != null ? round1(weightedReadiness) : null,
    assessmentAverage: assessmentAverage != null ? round1(assessmentAverage) : null,
    marksOpportunityPct,
    drivers,
    algorithmVersion: config.version,
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
