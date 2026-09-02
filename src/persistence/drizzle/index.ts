import { pingDatabase } from '@/lib/db';
import type { Repositories } from '../ports';

/**
 * PostgreSQL repository set (via Drizzle). Table-backed implementations are
 * added from TASK-002 onward; for now only the health probe is wired.
 */
export function createDrizzleRepositories(): Repositories {
  return {
    health: {
      isReachable: () => pingDatabase(),
    },
  };
}
