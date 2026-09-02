import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDrizzleAssessmentRepository } from '@/persistence/drizzle/assessment-repository';
import { createDrizzleStudyWindowRepository } from '@/persistence/drizzle/study-window-repository';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { createDrizzlePlanningRepository } from '@/persistence/drizzle/planning-repository';
import { createDrizzleProgressRepository } from '@/persistence/drizzle/progress-repository';
import { createDrizzleReadinessRepository } from '@/persistence/drizzle/readiness-repository';
import { createDrizzleSessionRepository } from '@/persistence/drizzle/session-repository';
import type { DrizzleDb } from '@/persistence/drizzle/db';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { getActiveProfile } from './profile';
import { initRealProfile, profileConfigSchema, type ProfileConfig } from './init';
import configExample from '../../config/student.example.json';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(() => truncateAll(db));

const repos = () => ({
  planning: createDrizzlePlanningRepository(db),
  curriculum: createDrizzleCurriculumRepository(db),
  progress: createDrizzleProgressRepository(db),
  session: createDrizzleSessionRepository(db),
  readiness: createDrizzleReadinessRepository(db),
  assessment: createDrizzleAssessmentRepository(db),
  studyWindow: createDrizzleStudyWindowRepository(db),
});

const config: ProfileConfig = profileConfigSchema.parse(configExample);

describe('initRealProfile (Drizzle)', () => {
  it('creates the profile and it resolves through getActiveProfile', async () => {
    const r = repos();
    const { created, profile } = await initRealProfile(r, config);

    expect(created).toBe(true);
    const resolved = await getActiveProfile(r);
    expect(resolved).toMatchObject({
      studentName: config.student.displayName,
      yearLabel: config.academicYear.yearLabel,
      planId: profile.planId,
    });

    // the plan is ACTIVE and readiness has an initial snapshot per progress row
    expect(await r.planning.getActivePlan(profile.academicYearId)).not.toBeNull();
  });

  it('is idempotent across a fresh repository instance', async () => {
    await initRealProfile(repos(), config);
    const second = await initRealProfile(repos(), config);
    expect(second.created).toBe(false);
    expect(await repos().planning.listStudents()).toHaveLength(1);
  });
});
