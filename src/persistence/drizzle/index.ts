import { db, pingDatabase } from '@/lib/db';
import type { Repositories } from '../ports';
import { createDrizzleAssessmentRepository } from './assessment-repository';
import { createDrizzleStudyWindowRepository } from './study-window-repository';
import { createDrizzleEventRepository } from './event-repository';
import { createDrizzleRevisionRepository } from './revision-repository';
import { createDrizzleAssessmentResultRepository } from './assessment-result-repository';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleProgressRepository } from './progress-repository';
import { createDrizzleReadinessRepository } from './readiness-repository';
import { createDrizzleSchoolCalendarRepository } from './school-calendar-repository';
import { createDrizzleSessionRepository } from './session-repository';

/**
 * PostgreSQL repository set (via Drizzle), bound to the shared connection pool.
 */
export function createDrizzleRepositories(): Repositories {
  return {
    health: {
      isReachable: () => pingDatabase(),
    },
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
    schoolCalendar: createDrizzleSchoolCalendarRepository(db),
    progress: createDrizzleProgressRepository(db),
    session: createDrizzleSessionRepository(db),
    readiness: createDrizzleReadinessRepository(db),
    assessment: createDrizzleAssessmentRepository(db),
    studyWindow: createDrizzleStudyWindowRepository(db),
    events: createDrizzleEventRepository(db),
    revision: createDrizzleRevisionRepository(db),
    assessmentResult: createDrizzleAssessmentResultRepository(db),
  };
}
