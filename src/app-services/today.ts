import {
  buildDailyPlan,
  type DailyPlan,
  type PlannerEnergy,
} from '@/domain/planning/daily-planner';
import type { Repositories } from '@/persistence/ports';
import { buildDailyCandidates } from './candidates';
import { getCapacityRange } from './calendar';
import { persistDailyPlan, reconcilePastTasks } from './study-tasks';

type TodayRepos = Pick<
  Repositories,
  | 'progress'
  | 'planning'
  | 'curriculum'
  | 'readiness'
  | 'assessment'
  | 'schoolCalendar'
  | 'revision'
  | 'studyTask'
  | 'session'
>;

export const PLANNER_ENERGIES: PlannerEnergy[] = ['LOW', 'OK', 'HIGH'];

/**
 * The deterministic plan for one day: capacity (from the plan + school
 * calendar) → candidates → priority + guardrails → ≤3 primary tasks.
 * Returns null when the academic year or plan is missing.
 */
export async function getTodayPlan(
  repos: TodayRepos,
  academicYearId: string,
  planId: string,
  asOf: string,
  energy: PlannerEnergy = 'OK',
): Promise<DailyPlan | null> {
  const [range, candidates] = await Promise.all([
    getCapacityRange(repos, planId, asOf, asOf),
    buildDailyCandidates(repos, academicYearId, asOf),
  ]);
  if (!range) return null;

  const capacityMinutes = range.days[0]?.minutes ?? 0;
  return buildDailyPlan({ candidates, capacityMinutes, energy, asOf });
}

/**
 * Same as {@link getTodayPlan}, but first reconciles yesterday's unresolved
 * tasks (COMPLETED / MISSED) so today's candidates carry an accurate backlog,
 * and then persists the plan it produced. This is the write path behind
 * `/today`; a background job will call it too (Phase 3 slice 5).
 */
export async function syncTodayPlan(
  repos: TodayRepos,
  academicYearId: string,
  planId: string,
  asOf: string,
  energy: PlannerEnergy = 'OK',
): Promise<DailyPlan | null> {
  await reconcilePastTasks(repos, academicYearId, asOf);
  const plan = await getTodayPlan(repos, academicYearId, planId, asOf, energy);
  if (plan) await persistDailyPlan(repos, academicYearId, plan);
  return plan;
}
