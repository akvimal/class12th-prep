import type { Repositories } from '@/persistence/ports';
import { daysBetween } from '@/domain/planning/dates';
import { reviewV1 } from '@/config/review';
import { getActiveProfile } from '@/app-services/profile';
import { detectDailyEvents } from '@/app-services/events';
import { getTodayPlan } from '@/app-services/today';
import { persistDailyPlan, reconcilePastTasks } from '@/app-services/study-tasks';
import { generateWeeklyReview } from '@/app-services/weekly-review';

export interface DailyJobResult {
  ran: boolean;
  asOf: string;
  /** Yesterday's unresolved tasks, now closed. */
  reconciled: { completed: number; missed: number };
  planPersisted: boolean;
  events: { generated: number; types: string[] };
  /** The rolling weekly review was refreshed; `announced` on a week boundary. */
  weeklyReview: { refreshed: boolean; announced: boolean };
}

const EMPTY = (asOf: string): DailyJobResult => ({
  ran: false,
  asOf,
  reconciled: { completed: 0, missed: 0 },
  planPersisted: false,
  events: { generated: 0, types: [] },
  weeklyReview: { refreshed: false, announced: false },
});

/**
 * The once-a-day background pass for the active profile. Idempotent — safe to
 * run repeatedly (a second run the same day is a near no-op). Never invoked
 * from the web request path; a worker entrypoint schedules it
 * (`scripts/run-daily-jobs.ts`, `pnpm jobs:daily`).
 *
 * It (1) reconciles yesterday's plan (COMPLETED / MISSED), (2) regenerates and
 * persists today's plan so `/today` is fresh before the first visit, and
 * (3) generates the day's domain events. Delivery channels stay off until
 * Phase 7 — events just accumulate as PENDING.
 */
export async function runDailyJobs(
  repos: Repositories,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<DailyJobResult> {
  const profile = await getActiveProfile(repos);
  if (!profile) return EMPTY(asOf);

  const reconciled = await reconcilePastTasks(repos, profile.academicYearId, asOf);

  const plan = await getTodayPlan(repos, profile.academicYearId, profile.planId, asOf);
  if (plan) await persistDailyPlan(repos, profile.academicYearId, plan);

  const events = await detectDailyEvents(repos, profile.academicYearId, asOf);

  // The review covers the completed week; announce it once, on a 7-day boundary
  // from the plan start.
  const planRecord = await repos.planning.getPlan(profile.planId);
  const onWeekBoundary =
    planRecord != null &&
    asOf > planRecord.startDate &&
    daysBetween(planRecord.startDate, asOf) % reviewV1.weekLengthDays === 0;
  const review = await generateWeeklyReview(repos, profile.academicYearId, asOf, {
    announce: onWeekBoundary,
  });

  return {
    ran: true,
    asOf,
    reconciled,
    planPersisted: plan !== null,
    events: { generated: events?.generated ?? 0, types: events?.createdTypes ?? [] },
    weeklyReview: { refreshed: review !== null, announced: onWeekBoundary },
  };
}
