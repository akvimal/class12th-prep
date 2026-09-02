import type { Repositories } from '@/persistence/ports';
import { getActiveProfile } from '@/app-services/profile';
import { detectDailyEvents } from '@/app-services/events';

/**
 * Worker job: generate the day's domain events for the active student profile.
 * Idempotent — safe to run repeatedly. A worker entrypoint (Phase 3+) schedules
 * this; it never runs on the web request path.
 */
export async function generateDailyEvents(
  repos: Repositories,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<{ ran: boolean; generated: number }> {
  const profile = await getActiveProfile(repos);
  if (!profile) return { ran: false, generated: 0 };

  const result = await detectDailyEvents(repos, profile.academicYearId, asOf);
  return { ran: true, generated: result?.generated ?? 0 };
}
