import type { Repositories } from '../ports';
import { createInMemoryPlanningRepository } from './planning-repository';

/**
 * In-memory repository set. Backs the UI shell (before Postgres lands) and
 * unit tests. Curriculum/progress repositories are added from TASK-003 onward.
 */
export function createInMemoryRepositories(): Repositories {
  return {
    health: {
      isReachable: async () => true,
    },
    planning: createInMemoryPlanningRepository(),
  };
}
