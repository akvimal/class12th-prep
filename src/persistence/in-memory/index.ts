import type { Repositories } from '../ports';
import { createInMemoryAssessmentRepository } from './assessment-repository';
import { createInMemoryAssessmentResultRepository } from './assessment-result-repository';
import { createInMemoryStudyWindowRepository } from './study-window-repository';
import { createInMemoryEventRepository } from './event-repository';
import { createInMemoryRevisionRepository } from './revision-repository';
import { createInMemoryCurriculumRepository } from './curriculum-repository';
import { createInMemoryPlanningRepository } from './planning-repository';
import { createInMemoryProgressRepository } from './progress-repository';
import { createInMemoryReadinessRepository } from './readiness-repository';
import { createInMemorySchoolCalendarRepository } from './school-calendar-repository';
import { createInMemorySessionRepository } from './session-repository';

/**
 * In-memory repository set. Backs the UI shell (before Postgres lands) and
 * unit tests. Progress/session repositories are added from Phase 1 onward.
 */
export function createInMemoryRepositories(): Repositories {
  const assessment = createInMemoryAssessmentRepository();
  return {
    health: {
      isReachable: async () => true,
    },
    planning: createInMemoryPlanningRepository(),
    curriculum: createInMemoryCurriculumRepository(),
    schoolCalendar: createInMemorySchoolCalendarRepository(),
    progress: createInMemoryProgressRepository(),
    session: createInMemorySessionRepository(),
    readiness: createInMemoryReadinessRepository(),
    assessment,
    studyWindow: createInMemoryStudyWindowRepository(),
    events: createInMemoryEventRepository(),
    revision: createInMemoryRevisionRepository(),
    assessmentResult: createInMemoryAssessmentResultRepository(
      async (id) => (await assessment.getAssessment(id))?.academicYearId ?? null,
    ),
  };
}
