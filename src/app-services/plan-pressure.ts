import { planPressureV1 } from '@/config/plan-pressure';
import { computePlanPressure, type PlanPressure } from '@/domain/planning/plan-pressure';
import { daysBetween } from '@/domain/planning/dates';
import { isSchoolAssessment } from '@/domain/assessment/assessment';
import type { Repositories } from '@/persistence/ports';
import { getCapacityRange } from './calendar';
import { getCurriculumProgress } from './progress';

type PressureRepos = Pick<
  Repositories,
  'planning' | 'curriculum' | 'progress' | 'schoolCalendar' | 'revision' | 'assessment'
>;

/**
 * Plan pressure for the window from `asOf` to the syllabus target
 * (docs/ALGORITHMS.md §8). Null when the plan is missing.
 */
export async function getPlanPressure(
  repos: PressureRepos,
  academicYearId: string,
  planId: string,
  asOf: string,
): Promise<PlanPressure | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;

  const target = plan.syllabusTargetDate;
  const remainingDays = Math.max(0, daysBetween(asOf, target));

  const [progress, revisions, assessments] = await Promise.all([
    getCurriculumProgress(repos, academicYearId),
    repos.revision.listSchedules(academicYearId, { status: 'SCHEDULED', dueOnOrBefore: target }),
    repos.assessment.listAssessments(academicYearId, {
      from: asOf,
      to: target,
      status: 'ANNOUNCED',
    }),
  ]);

  const capacity =
    asOf < target ? await getCapacityRange(repos, planId, asOf, target) : { totalMinutes: 0 };

  const chapters = (progress?.subjects ?? []).flatMap((s) =>
    s.units.flatMap((u) =>
      u.chapters.map((c) => ({
        boardWeight: c.weights[0]?.value ?? null,
        effectiveReadiness: c.progress.effectiveReadiness,
        examReady: c.progress.state === 'EXAM_READY',
      })),
    ),
  );

  return computePlanPressure(
    {
      remainingDays,
      capacityMinutes: capacity?.totalMinutes ?? 0,
      chapters,
      revisionsDue: revisions.length,
      assessmentsUpcoming: assessments.filter((a) => isSchoolAssessment(a.type)).length,
    },
    planPressureV1,
  );
}
