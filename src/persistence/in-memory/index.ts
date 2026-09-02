import type { Repositories } from '../ports';
import { createInMemoryCurriculumRepository } from './curriculum-repository';
import { createInMemoryPlanningRepository } from './planning-repository';
import { createInMemorySchoolCalendarRepository } from './school-calendar-repository';

/**
 * In-memory repository set. Backs the UI shell (before Postgres lands) and
 * unit tests. Progress/session repositories are added from Phase 1 onward.
 */
export function createInMemoryRepositories(): Repositories {
  return {
    health: {
      isReachable: async () => true,
    },
    planning: createInMemoryPlanningRepository(),
    curriculum: createInMemoryCurriculumRepository(),
    schoolCalendar: createInMemorySchoolCalendarRepository(),
  };
}
