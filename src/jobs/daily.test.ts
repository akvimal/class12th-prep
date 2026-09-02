import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from '@/app-services/seed';
import { addAssessment } from '@/app-services/assessment';
import { runDailyJobs } from './daily';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

describe('runDailyJobs', () => {
  it('does nothing without an active profile', async () => {
    const repos = createInMemoryRepositories();
    const result = await runDailyJobs(repos, '2026-09-02');
    expect(result.ran).toBe(false);
    expect(result.planPersisted).toBe(false);
  });

  it('persists the plan, reconciles the past day and generates events', async () => {
    const { repos, academicYearId } = await seeded();
    // an imminent school test → a SCHOOL_TEST_APPROACHING event
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'CS test',
      examDate: '2026-09-05',
      subjectKey: 'CS',
      chapterKeys: ['CS03'],
    });

    // seed a stale plan for the day before
    const first = await runDailyJobs(repos, '2026-09-01');
    expect(first.ran).toBe(true);
    expect(first.planPersisted).toBe(true);
    const plannedYesterday = await repos.studyTask.listTasks(academicYearId, {
      plannedDate: '2026-09-01',
      status: 'SCHEDULED',
    });
    expect(plannedYesterday.length).toBeGreaterThan(0);

    const today = await runDailyJobs(repos, '2026-09-02');
    // every scheduled task from yesterday is now resolved one way or the other
    expect(today.reconciled.completed + today.reconciled.missed).toBe(plannedYesterday.length);
    expect(today.reconciled.missed).toBeGreaterThanOrEqual(1);
    expect(today.events.types).toContain('SCHOOL_TEST_APPROACHING');
    expect(
      (
        await repos.studyTask.listTasks(academicYearId, {
          plannedDate: '2026-09-01',
          status: 'SCHEDULED',
        })
      ).length,
    ).toBe(0);
  });

  it('is idempotent — a second run the same day adds nothing', async () => {
    const { repos, academicYearId } = await seeded();
    await runDailyJobs(repos, '2026-09-02');
    const a = await runDailyJobs(repos, '2026-09-02');
    expect(a.events.generated).toBe(0);
    expect(a.reconciled).toEqual({ completed: 0, missed: 0 });
    const scheduled = await repos.studyTask.listTasks(academicYearId, {
      plannedDate: '2026-09-02',
      status: 'SCHEDULED',
    });
    // one open row per chapter, never duplicated
    const chapterIds = scheduled.map((t) => t.chapterId);
    expect(new Set(chapterIds).size).toBe(chapterIds.length);
  });
});
