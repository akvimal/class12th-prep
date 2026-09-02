import { db, pingDatabase } from '@/lib/db';
import type { Repositories } from '../ports';
import { createDrizzlePlanningRepository } from './planning-repository';

/**
 * PostgreSQL repository set (via Drizzle), bound to the shared connection pool.
 */
export function createDrizzleRepositories(): Repositories {
  return {
    health: {
      isReachable: () => pingDatabase(),
    },
    planning: createDrizzlePlanningRepository(db),
  };
}
