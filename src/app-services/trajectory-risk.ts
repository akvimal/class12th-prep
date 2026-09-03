import { trajectoryRiskV1 } from '@/config/trajectory-risk';
import { assessTrajectoryRisk, type TrajectoryRisk } from '@/domain/planning/trajectory-risk';
import type { Repositories } from '@/persistence/ports';
import { getCurriculumProgress } from './progress';

type RiskRepos = Pick<Repositories, 'planning' | 'curriculum' | 'progress'>;

const NEUTRAL_WEIGHT = 5;

/**
 * Trajectory risk for the active plan (docs/ALGORITHMS.md §9). Weighted
 * completion is Σ(weight·readiness) ÷ Σ weight over every chapter. Null when the
 * plan is missing.
 */
export async function getTrajectoryRisks(
  repos: RiskRepos,
  academicYearId: string,
  planId: string,
  asOf: string,
): Promise<TrajectoryRisk[] | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;

  const progress = await getCurriculumProgress(repos, academicYearId);
  const chapters = (progress?.subjects ?? []).flatMap((s) => s.units.flatMap((u) => u.chapters));

  let weightSum = 0;
  let completionSum = 0;
  for (const c of chapters) {
    const weight = c.weights[0]?.value ?? NEUTRAL_WEIGHT;
    const readiness = Math.max(0, Math.min(100, c.progress.effectiveReadiness ?? 0));
    weightSum += weight;
    completionSum += weight * (readiness / 100);
  }
  const actualWeightedCompletion = weightSum > 0 ? completionSum / weightSum : 0;

  return assessTrajectoryRisk(
    {
      planStart: plan.startDate,
      syllabusTarget: plan.syllabusTargetDate,
      hardCompletion: plan.hardCompletionDate,
      asOf,
      actualWeightedCompletion,
    },
    trajectoryRiskV1,
  );
}
