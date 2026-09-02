import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCapacityRange, getDailyCapacity } from '@/app-services/calendar';
import { getPlanOverview } from '@/app-services/plan';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { createDrizzlePlanningRepository } from '@/persistence/drizzle/planning-repository';
import { createDrizzleSchoolCalendarRepository } from '@/persistence/drizzle/school-calendar-repository';
import type { DrizzleDb } from '@/persistence/drizzle/db';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { createTestDatabase } from '@/persistence/testing/test-db';
import { seedSynthetic } from './seed';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
});
afterEach(() => close());

const drizzleRepos = () => ({
  planning: createDrizzlePlanningRepository(db),
  curriculum: createDrizzleCurriculumRepository(db),
  schoolCalendar: createDrizzleSchoolCalendarRepository(db),
});

describe('seedSynthetic (Drizzle)', () => {
  it('loads the whole scenario in one call', async () => {
    const repos = drizzleRepos();
    const result = await seedSynthetic(repos);

    expect(result.created).toBe(true);
    expect(result.counts).toEqual({
      subjects: 4,
      chapters: 12,
      enrollments: 4,
      calendarEvents: 4,
    });

    const hierarchy = await repos.curriculum.getHierarchy(result.curriculumVersionId);
    expect(hierarchy.map((s) => s.name)).toEqual([
      'Physics',
      'Chemistry',
      'Mathematics',
      'Computer Science',
    ]);

    // the plan is active and its phases resolve
    const overview = await getPlanOverview(repos, result.planId!, '2026-09-02');
    expect(overview?.plan.status).toBe('ACTIVE');
    expect(overview?.currentPhase).toBe('SYLLABUS_COVERAGE');

    // the seeded calendar drives capacity
    expect((await getDailyCapacity(repos, result.planId!, '2027-01-20'))?.basis).toBe(
      'STUDY_LEAVE',
    );
    const range = await getCapacityRange(repos, result.planId!, '2026-12-25', '2026-12-31');
    expect(range?.days.every((d) => d.basis === 'VACATION')).toBe(true);
  });

  it('is idempotent — a second call writes nothing', async () => {
    const repos = drizzleRepos();
    const first = await seedSynthetic(repos);
    const second = await seedSynthetic(repos);

    expect(second.created).toBe(false);
    expect(second.curriculumVersionId).toBe(first.curriculumVersionId);
    expect(await repos.curriculum.listVersions()).toHaveLength(1);
    expect(await repos.planning.listStudentsByFamily(first.familyId!)).toHaveLength(1);
  });
});

describe('seedSynthetic (in-memory)', () => {
  it('loads and is idempotent', async () => {
    const repos = createInMemoryRepositories();
    const first = await seedSynthetic(repos);
    expect(first.created).toBe(true);
    expect((await seedSynthetic(repos)).created).toBe(false);

    const enrollments = await repos.planning.listEnrollments(first.academicYearId!);
    expect(enrollments).toHaveLength(4);
  });
});
