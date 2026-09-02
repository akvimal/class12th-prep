import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { buildDailyCandidates } from './candidates';
import { getTodayPlan, syncTodayPlan } from './today';
import { logStudy } from './study-flow';
import { persistDailyPlan, reconcilePastTasks } from './study-tasks';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('persistDailyPlan', () => {
  it('stores primary + optional tasks and is idempotent on regeneration', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const plan = (await getTodayPlan(repos, academicYearId, planId, '2026-09-02'))!;

    await persistDailyPlan(repos, academicYearId, plan);
    await persistDailyPlan(repos, academicYearId, plan);

    const stored = await repos.studyTask.listTasks(academicYearId, { plannedDate: '2026-09-02' });
    expect(stored.length).toBe(plan.primary.length + plan.optional.length);
    expect(stored.every((t) => t.status === 'SCHEDULED')).toBe(true);
    expect(stored.filter((t) => t.slot === 'PRIMARY').length).toBe(plan.primary.length);
  });

  it('cancels a task the plan no longer proposes', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const plan = (await getTodayPlan(repos, academicYearId, planId, '2026-09-02'))!;
    await persistDailyPlan(repos, academicYearId, plan);

    await persistDailyPlan(repos, academicYearId, {
      ...plan,
      primary: plan.primary.slice(0, 1),
      optional: [],
    });

    const scheduled = await repos.studyTask.listTasks(academicYearId, {
      plannedDate: '2026-09-02',
      status: 'SCHEDULED',
    });
    expect(scheduled.length).toBe(1);
    const cancelled = await repos.studyTask.listTasks(academicYearId, {
      plannedDate: '2026-09-02',
      status: 'CANCELLED',
    });
    expect(cancelled.length).toBeGreaterThan(0);
  });
});

describe('reconcilePastTasks', () => {
  it('marks an unworked past task MISSED and a worked one COMPLETED', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const plan = (await getTodayPlan(repos, academicYearId, planId, '2026-09-01'))!;
    await persistDailyPlan(repos, academicYearId, { ...plan, asOf: '2026-09-01' });

    const before = await repos.studyTask.listTasks(academicYearId, { plannedDate: '2026-09-01' });
    expect(before.length).toBeGreaterThanOrEqual(2);
    const worked = before[0]!;
    await logStudy(repos, academicYearId, {
      type: 'LEARN',
      completion: 'YES',
      chapterId: worked.chapterId,
      actualMinutes: 30,
      sessionDate: '2026-09-01',
    });

    // the remaining scheduled tasks — untouched — become MISSED
    const result = await reconcilePastTasks(repos, academicYearId, '2026-09-02');
    expect(result.missed).toBeGreaterThanOrEqual(1);

    const after = await repos.studyTask.listTasks(academicYearId, { plannedDate: '2026-09-01' });
    const workedAfter = after.find((t) => t.chapterId === worked.chapterId)!;
    expect(workedAfter.status).toBe('COMPLETED'); // resolved same-day by logStudy
    expect(workedAfter.sourceSessionId).not.toBeNull();
    expect(after.some((t) => t.status === 'MISSED')).toBe(true);
  });

  it('a missed task raises its chapter backlog in the next candidate set', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const plan = (await getTodayPlan(repos, academicYearId, planId, '2026-09-01'))!;
    await persistDailyPlan(repos, academicYearId, { ...plan, asOf: '2026-09-01' });
    await reconcilePastTasks(repos, academicYearId, '2026-09-02');

    const missed = await repos.studyTask.missedCountByChapter(academicYearId);
    const missedChapterId = Object.keys(missed)[0]!;
    expect(missed[missedChapterId]).toBeGreaterThanOrEqual(1);

    const candidates = await buildDailyCandidates(repos, academicYearId, '2026-09-02');
    const missedCandidate = candidates.find((c) => c.priority.missedCount > 0);
    expect(missedCandidate).toBeDefined();
  });
});

describe('syncTodayPlan', () => {
  it('reconciles the past and persists the fresh plan in one call', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const yesterday = (await getTodayPlan(repos, academicYearId, planId, '2026-09-01'))!;
    await persistDailyPlan(repos, academicYearId, { ...yesterday, asOf: '2026-09-01' });

    const plan = await syncTodayPlan(repos, academicYearId, planId, '2026-09-02');
    expect(plan).not.toBeNull();

    expect(
      (
        await repos.studyTask.listTasks(academicYearId, {
          plannedDate: '2026-09-01',
          status: 'SCHEDULED',
        })
      ).length,
    ).toBe(0);
    expect(
      (
        await repos.studyTask.listTasks(academicYearId, {
          plannedDate: '2026-09-02',
          status: 'SCHEDULED',
        })
      ).length,
    ).toBe(plan!.primary.length + plan!.optional.length);
  });
});
