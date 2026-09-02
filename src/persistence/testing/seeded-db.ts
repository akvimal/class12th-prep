import { seedSynthetic, type SeedResult } from '@/app-services/seed';
import { createDrizzleAssessmentRepository } from '@/persistence/drizzle/assessment-repository';
import { createDrizzleStudyWindowRepository } from '@/persistence/drizzle/study-window-repository';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { createDrizzlePlanningRepository } from '@/persistence/drizzle/planning-repository';
import { createDrizzleProgressRepository } from '@/persistence/drizzle/progress-repository';
import { createDrizzleReadinessRepository } from '@/persistence/drizzle/readiness-repository';
import { createDrizzleSchoolCalendarRepository } from '@/persistence/drizzle/school-calendar-repository';
import { createDrizzleSessionRepository } from '@/persistence/drizzle/session-repository';
import type { DrizzleDb } from '@/persistence/drizzle/db';
import { createTestDatabase } from './test-db';

/** Load the synthetic validation seed into an already-migrated database. */
export function seedTestDatabase(db: DrizzleDb): Promise<SeedResult> {
  return seedSynthetic({
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
    schoolCalendar: createDrizzleSchoolCalendarRepository(db),
    progress: createDrizzleProgressRepository(db),
    session: createDrizzleSessionRepository(db),
    readiness: createDrizzleReadinessRepository(db),
    assessment: createDrizzleAssessmentRepository(db),
    studyWindow: createDrizzleStudyWindowRepository(db),
  });
}

/**
 * A migrated PGlite database preloaded with the synthetic validation seed
 * (docs/TEST_STRATEGY.md golden fixture). For repeated use in one file, prefer
 * `createTestDatabase` in `beforeAll` + `truncateAll` / `seedTestDatabase` in
 * `beforeEach`.
 */
export async function createSeededTestDatabase(): Promise<{
  db: DrizzleDb;
  seed: SeedResult;
  close: () => Promise<void>;
}> {
  const { db, close } = await createTestDatabase();
  const seed = await seedTestDatabase(db);
  return { db, seed, close };
}
