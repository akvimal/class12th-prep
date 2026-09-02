import type { Repositories } from '@/persistence/ports';
import { systemStatus, type SystemStatus } from '@/domain/system-status';

/**
 * Application services — use-cases that orchestrate domain logic and
 * repositories. Route handlers and server components call these; they never
 * reach past this layer into persistence directly.
 *
 * Only the health check exists so far.
 */
export async function getHealth(
  repos: Repositories,
): Promise<{ status: SystemStatus; checks: { database: boolean } }> {
  const database = await repos.health.isReachable();
  return { status: systemStatus({ database }), checks: { database } };
}
