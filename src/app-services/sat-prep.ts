import { satPrepV1 } from '@/config/sat-prep';
import { daysBetween } from '@/domain/planning/dates';
import {
  rankDomainPriorities,
  type SatDomain,
  type SatDomainPriority,
} from '@/domain/sat/sat-domain';
import { buildSatPrepWeeks, type SatPrepWeek } from '@/domain/sat/sat-plan';
import type {
  NewSatAttempt,
  NewSatPrepSession,
  Repositories,
  SatAttemptRecord,
  SatPrepPlanRecord,
  SatPrepSessionRecord,
} from '@/persistence/ports';

type WithSatPrep = Pick<Repositories, 'satPrep'>;

export function recordSatAttempt(
  repos: WithSatPrep,
  input: NewSatAttempt,
): Promise<SatAttemptRecord> {
  return repos.satPrep.addAttempt(input);
}

export function listSatAttempts(
  repos: WithSatPrep,
  studentId: string,
): Promise<SatAttemptRecord[]> {
  return repos.satPrep.listAttempts(studentId);
}

/** Domain focus priorities from the latest vs. previous attempt's evidence. */
export async function getSatDomainPriorities(
  repos: WithSatPrep,
  studentId: string,
): Promise<SatDomainPriority[]> {
  const attempts = await repos.satPrep.listAttempts(studentId);
  return rankDomainPriorities(
    attempts.map((a) => ({ attemptNumber: a.attemptNumber, domainScores: a.domainScores })),
    satPrepV1,
  );
}

export interface StartSatPrepPlanInput {
  testDate: string;
  startDate: string;
  weeklyTargetMinutes?: number;
}

/** Starts the one ACTIVE SAT prep plan for a student. Throws if one is already active. */
export function startSatPrepPlan(
  repos: WithSatPrep,
  studentId: string,
  input: StartSatPrepPlanInput,
): Promise<SatPrepPlanRecord> {
  return repos.satPrep.createPlan({
    studentId,
    testDate: input.testDate,
    startDate: input.startDate,
    weeklyTargetMinutes: input.weeklyTargetMinutes ?? satPrepV1.defaultWeeklyTargetMinutes,
  });
}

export function logSatPrepSession(
  repos: WithSatPrep,
  input: NewSatPrepSession,
): Promise<SatPrepSessionRecord> {
  return repos.satPrep.recordSession(input);
}

export interface SatPrepOverview {
  plan: SatPrepPlanRecord;
  attempts: SatAttemptRecord[];
  priorities: SatDomainPriority[];
  weeks: SatPrepWeek[];
  currentWeek: SatPrepWeek | null;
  sessions: SatPrepSessionRecord[];
  daysUntilTest: number;
  minutesLoggedThisWeek: number;
}

/** Everything the `/exam-prep` screen renders, or null if no plan is active. */
export async function getSatPrepOverview(
  repos: WithSatPrep,
  studentId: string,
  asOf: string,
): Promise<SatPrepOverview | null> {
  const plan = await repos.satPrep.getActivePlan(studentId);
  if (!plan) return null;

  const [attempts, sessions] = await Promise.all([
    repos.satPrep.listAttempts(studentId),
    repos.satPrep.listSessions(plan.id),
  ]);

  const priorities = rankDomainPriorities(
    attempts.map((a) => ({ attemptNumber: a.attemptNumber, domainScores: a.domainScores })),
    satPrepV1,
  );
  const weeks = buildSatPrepWeeks(plan.startDate, plan.testDate, priorities, satPrepV1);
  const currentWeek = weeks.find((w) => asOf >= w.startDate && asOf <= w.endDate) ?? null;

  const weekStart = currentWeek?.startDate ?? asOf;
  const weekEnd = currentWeek?.endDate ?? asOf;
  const minutesLoggedThisWeek = sessions
    .filter((s) => s.sessionDate >= weekStart && s.sessionDate <= weekEnd)
    .reduce((sum, s) => sum + s.actualMinutes, 0);

  return {
    plan,
    attempts,
    priorities,
    weeks,
    currentWeek,
    sessions,
    daysUntilTest: daysBetween(asOf, plan.testDate),
    minutesLoggedThisWeek,
  };
}

export type { SatDomain };
