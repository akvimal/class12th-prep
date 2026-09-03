import { courseCorrectionV1 } from '@/config/course-correction';
import {
  generateCourseCorrections,
  type CourseCorrection,
  type CourseCorrectionKind,
} from '@/domain/planning/course-correction';
import { addDays, daysBetween } from '@/domain/planning/dates';
import type { Repositories } from '@/persistence/ports';
import { getPlanPressure } from './plan-pressure';
import { getBoardProjection } from './projection';
import { getStudentOverview } from './overview';

type CorrectionRepos = Pick<
  Repositories,
  | 'planning'
  | 'curriculum'
  | 'progress'
  | 'schoolCalendar'
  | 'revision'
  | 'assessment'
  | 'assessmentResult'
  | 'readiness'
>;

export interface CourseCorrectionView {
  pressureBand: string;
  deficitMinutes: number;
  projectionGap: number | null;
  corrections: CourseCorrection[];
  algorithmVersion: string;
}

/**
 * Course corrections for the active plan (build-plan Phase 5). Empty
 * `corrections` when the plan is not under pressure. Null when the plan is
 * missing.
 */
export async function getCourseCorrections(
  repos: CorrectionRepos,
  academicYearId: string,
  planId: string,
  asOf: string,
): Promise<CourseCorrectionView | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;

  const [pressure, projection, overview] = await Promise.all([
    getPlanPressure(repos, academicYearId, planId, asOf),
    getBoardProjection(repos, academicYearId),
    getStudentOverview(repos, academicYearId, planId, asOf),
  ]);
  if (!pressure) return null;

  const projectionGap =
    projection?.overall.projectedPct != null && projection.overall.targetPct != null
      ? Math.max(
          0,
          Math.round((projection.overall.targetPct - projection.overall.projectedPct) * 10) / 10,
        )
      : null;

  const corrections = generateCourseCorrections(
    {
      pressureBand: pressure.band,
      deficitMinutes: pressure.deficitMinutes,
      remainingDays: Math.max(0, daysBetween(asOf, plan.syllabusTargetDate)),
      weekdayCapacityMinutes: plan.weekdayCapacityMinutes,
      weakChapterCount: overview?.needsAttention.length ?? 0,
      projectionGap,
    },
    courseCorrectionV1,
  );

  return {
    pressureBand: pressure.band,
    deficitMinutes: pressure.deficitMinutes,
    projectionGap,
    corrections,
    algorithmVersion: courseCorrectionV1.version,
  };
}

export interface ApplyCorrectionResult {
  applied: boolean;
  kind: CourseCorrectionKind;
  message: string;
}

/**
 * Apply one course correction — forward plan only, evidence untouched.
 * REPRIORITISE is a no-op (the planner already ranks by weakness); ADD_CAPACITY
 * and MOVE_TARGET are plan-date/capacity diffs applied through `updatePlan`
 * (which re-validates ordering and regenerates phases).
 */
export async function applyCourseCorrection(
  repos: Pick<Repositories, 'planning'>,
  planId: string,
  kind: CourseCorrectionKind,
  params: { weekdayMinutesDelta?: number; targetShiftDays?: number },
): Promise<ApplyCorrectionResult> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return { applied: false, kind, message: 'plan not found' };

  if (kind === 'REPRIORITISE') {
    return {
      applied: true,
      kind,
      message: 'The daily plan already leads with the weakest critical-path chapters.',
    };
  }

  if (kind === 'ADD_CAPACITY') {
    const delta = Math.max(1, params.weekdayMinutesDelta ?? 0);
    await repos.planning.updatePlan(planId, {
      weekdayCapacityMinutes: plan.weekdayCapacityMinutes + delta,
    });
    return {
      applied: true,
      kind,
      message: `Weekday study block raised to ${plan.weekdayCapacityMinutes + delta} minutes.`,
    };
  }

  // MOVE_TARGET — shift the coverage/consolidation dates together, clamped so
  // the revision window still ends before the exam.
  const requested = Math.max(1, params.targetShiftDays ?? 0);
  const slack = daysBetween(plan.revisionStartDate, plan.examWindowStart);
  const shift = Math.max(0, Math.min(requested, slack));
  if (shift === 0) {
    return {
      applied: false,
      kind,
      message: 'no room to move the target without hitting the exam window',
    };
  }
  await repos.planning.updatePlan(planId, {
    syllabusTargetDate: addDays(plan.syllabusTargetDate, shift),
    hardCompletionDate: addDays(plan.hardCompletionDate, shift),
    revisionStartDate: addDays(plan.revisionStartDate, shift),
  });
  return {
    applied: true,
    kind,
    message: `Syllabus target moved ${shift} day${shift === 1 ? '' : 's'} to ${addDays(
      plan.syllabusTargetDate,
      shift,
    )}.`,
  };
}
