import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getCapacityRange, getDailyCapacity } from '@/app-services/calendar';
import { getPlanOverview } from '@/app-services/plan';
import { createDrizzleAssessmentRepository } from '@/persistence/drizzle/assessment-repository';
import { createDrizzleRevisionRepository } from '@/persistence/drizzle/revision-repository';
import { createDrizzleStudyWindowRepository } from '@/persistence/drizzle/study-window-repository';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { createDrizzlePlanningRepository } from '@/persistence/drizzle/planning-repository';
import { createDrizzleProgressRepository } from '@/persistence/drizzle/progress-repository';
import { createDrizzleReadinessRepository } from '@/persistence/drizzle/readiness-repository';
import { createDrizzleSchoolCalendarRepository } from '@/persistence/drizzle/school-calendar-repository';
import { createDrizzleSessionRepository } from '@/persistence/drizzle/session-repository';
import type { DrizzleDb } from '@/persistence/drizzle/db';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedSynthetic } from './seed';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(() => truncateAll(db));

const drizzleRepos = () => ({
  planning: createDrizzlePlanningRepository(db),
  curriculum: createDrizzleCurriculumRepository(db),
  schoolCalendar: createDrizzleSchoolCalendarRepository(db),
  progress: createDrizzleProgressRepository(db),
  session: createDrizzleSessionRepository(db),
  readiness: createDrizzleReadinessRepository(db),
  assessment: createDrizzleAssessmentRepository(db),
  studyWindow: createDrizzleStudyWindowRepository(db),
  revision: createDrizzleRevisionRepository(db),
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
      chapterProgress: 12,
      studySessions: 4,
      assessments: 3,
      readinessSnapshots: 12,
    });

    // chapter progress from the fixture is loaded, and readiness has been computed
    const progress = await repos.progress.listChapterProgress(result.academicYearId!);
    expect(progress).toHaveLength(12);
    expect(progress.some((p) => p.schoolStatus === 'CURRENTLY_TEACHING')).toBe(true);
    expect(progress.every((p) => p.effectiveReadiness !== null)).toBe(true);

    const readiness = await repos.readiness.latestByScope(result.academicYearId!, 'CHAPTER');
    expect(readiness).toHaveLength(12);
    expect(readiness.every((s) => s.algorithmVersion === 'readiness-v1')).toBe(true);

    // study session history is loaded, newest first
    const sessions = await repos.session.listSessions(result.academicYearId!);
    expect(sessions).toHaveLength(4);
    expect(sessions[0]!.sessionDate >= sessions[3]!.sessionDate).toBe(true);
    expect(sessions.some((s) => s.completion === 'PARTIAL')).toBe(true);

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
