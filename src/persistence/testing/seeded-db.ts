import { seedSynthetic, type SeedResult } from '@/app-services/seed';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { createDrizzlePlanningRepository } from '@/persistence/drizzle/planning-repository';
import { createDrizzleSchoolCalendarRepository } from '@/persistence/drizzle/school-calendar-repository';
import type { DrizzleDb } from '@/persistence/drizzle/db';
import { createTestDatabase } from './test-db';

/**
 * A migrated PGlite database preloaded with the synthetic validation seed
 * (docs/TEST_STRATEGY.md golden fixture). Later phases build their tests on
 * top of this instead of re-seeding by hand.
 */
export async function createSeededTestDatabase(): Promise<{
  db: DrizzleDb;
  seed: SeedResult;
  close: () => Promise<void>;
}> {
  const { db, close } = await createTestDatabase();
  const seed = await seedSynthetic({
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
    schoolCalendar: createDrizzleSchoolCalendarRepository(db),
  });
  return { db, seed, close };
}
