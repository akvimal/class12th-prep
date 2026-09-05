import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleSatPrepRepository } from './sat-prep-repository';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  await seedTestDatabase(db);
});

async function studentId(): Promise<string> {
  const [student] = await createDrizzlePlanningRepository(db).listStudents();
  return student!.id;
}

describe('drizzle SAT prep repository', () => {
  it('records an attempt with its domain scores and lists attempts ascending', async () => {
    const repo = createDrizzleSatPrepRepository(db);
    const sid = await studentId();

    await repo.addAttempt({
      studentId: sid,
      attemptNumber: 2,
      testDate: '2026-06-01',
      totalScore: 1390,
      readingWritingScore: 640,
      mathScore: 750,
      domainScores: [
        { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
      ],
    });
    await repo.addAttempt({
      studentId: sid,
      attemptNumber: 1,
      testDate: '2026-03-01',
      totalScore: 1300,
      readingWritingScore: 610,
      mathScore: 690,
      domainScores: [
        { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
      ],
    });

    const attempts = await repo.listAttempts(sid);
    expect(attempts.map((a) => a.attemptNumber)).toEqual([1, 2]);
    expect(attempts[1]!.domainScores).toHaveLength(1);
    expect(attempts[1]!.domainScores[0]!.domain).toBe('STANDARD_ENGLISH_CONVENTIONS');
  });

  it('allows at most one ACTIVE plan per student', async () => {
    const repo = createDrizzleSatPrepRepository(db);
    const sid = await studentId();

    await repo.createPlan({
      studentId: sid,
      testDate: '2026-11-07',
      startDate: '2026-09-05',
      weeklyTargetMinutes: 420,
    });

    await expect(
      repo.createPlan({
        studentId: sid,
        testDate: '2026-12-01',
        startDate: '2026-09-05',
        weeklyTargetMinutes: 300,
      }),
    ).rejects.toThrow();
  });

  it('updates plan fields and records + lists sessions newest first', async () => {
    const repo = createDrizzleSatPrepRepository(db);
    const sid = await studentId();

    const plan = await repo.createPlan({
      studentId: sid,
      testDate: '2026-11-07',
      startDate: '2026-09-05',
      weeklyTargetMinutes: 420,
    });
    expect((await repo.getActivePlan(sid))?.id).toBe(plan.id);

    const updated = await repo.updatePlan(plan.id, { weeklyTargetMinutes: 480 });
    expect(updated.weeklyTargetMinutes).toBe(480);

    await repo.recordSession({
      planId: plan.id,
      domain: 'GEOMETRY_TRIGONOMETRY',
      sessionDate: '2026-09-06',
      actualMinutes: 60,
    });
    await repo.recordSession({
      planId: plan.id,
      domain: 'STANDARD_ENGLISH_CONVENTIONS',
      sessionDate: '2026-09-08',
      actualMinutes: 45,
      fullPracticeTest: false,
      notes: 'grammar rule drill',
    });

    const sessions = await repo.listSessions(plan.id);
    expect(sessions.map((s) => s.sessionDate)).toEqual(['2026-09-08', '2026-09-06']);
    expect(sessions[0]!.notes).toBe('grammar rule drill');
  });
});
