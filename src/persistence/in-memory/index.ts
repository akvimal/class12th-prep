import type { Repositories } from '../ports';

/**
 * In-memory repository set. Backs the UI shell (before Postgres lands) and
 * unit tests. Seeded from fixtures/synthetic-academic-data.json from TASK-006.
 */
export function createInMemoryRepositories(): Repositories {
  return {
    health: {
      isReachable: async () => true,
    },
  };
}
