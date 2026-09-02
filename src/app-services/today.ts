import {
  buildDailyPlan,
  type DailyPlan,
  type PlannerEnergy,
} from '@/domain/planning/daily-planner';
import type { Repositories } from '@/persistence/ports';
import { buildDailyCandidates } from './candidates';
import { getCapacityRange } from './calendar';

type TodayRepos = Pick<
  Repositories,
  'progress' | 'planning' | 'curriculum' | 'readiness' | 'assessment' | 'schoolCalendar'
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
