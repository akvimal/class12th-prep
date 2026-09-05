import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import {
  getSatDomainPriorities,
  getSatPrepOverview,
  listSatAttempts,
  logSatPrepSession,
  recordSatAttempt,
  startSatPrepPlan,
} from './sat-prep';

const studentId = 'student-1';

async function withTwoAttempts() {
  const repos = createInMemoryRepositories();
  await recordSatAttempt(repos, {
    studentId,
    attemptNumber: 1,
    testDate: '2026-03-01',
    totalScore: 1300,
    readingWritingScore: 610,
    mathScore: 690,
    domainScores: [
      { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 490, performanceHigh: 540 },
      { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
      { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 680, performanceHigh: 800 },
    ],
  });
  await recordSatAttempt(repos, {
    studentId,
    attemptNumber: 2,
    testDate: '2026-06-01',
    totalScore: 1390,
    readingWritingScore: 640,
    mathScore: 750,
    domainScores: [
      { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 610, performanceHigh: 670 },
      { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
      { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 610, performanceHigh: 670 },
    ],
  });
  return repos;
}

describe('listSatAttempts / recordSatAttempt', () => {
  it('stores and lists attempts ascending by attempt number', async () => {
    const repos = await withTwoAttempts();
    const attempts = await listSatAttempts(repos, studentId);
    expect(attempts.map((a) => a.attemptNumber)).toEqual([1, 2]);
    expect(attempts[1]!.totalScore).toBe(1390);
  });
});

describe('getSatDomainPriorities', () => {
  it('ranks the flat/regressed domains from the two real attempts above the improved one', async () => {
    const repos = await withTwoAttempts();
    const priorities = await getSatDomainPriorities(repos, studentId);
    const byDomain = new Map(priorities.map((p) => [p.domain, p]));
    expect(byDomain.get('STANDARD_ENGLISH_CONVENTIONS')?.trend).toBe('FLAT');
    expect(byDomain.get('GEOMETRY_TRIGONOMETRY')?.trend).toBe('REGRESSED');
    expect(byDomain.get('CRAFT_AND_STRUCTURE')?.trend).toBe('IMPROVED');
  });
});

describe('startSatPrepPlan / getSatPrepOverview', () => {
  it('builds an overview with weeks, priorities and logged minutes for the current week', async () => {
    const repos = await withTwoAttempts();
    await startSatPrepPlan(repos, studentId, {
      testDate: '2026-11-07',
      startDate: '2026-09-05',
      weeklyTargetMinutes: 420,
    });

    const overview = await getSatPrepOverview(repos, studentId, '2026-09-06');
    expect(overview).not.toBeNull();
    expect(overview!.weeks).toHaveLength(9);
    expect(overview!.currentWeek?.weekNumber).toBe(1);
    expect(overview!.daysUntilTest).toBe(62);
    expect(overview!.minutesLoggedThisWeek).toBe(0);

    const plan = overview!.plan;
    await logSatPrepSession(repos, {
      planId: plan.id,
      domain: 'STANDARD_ENGLISH_CONVENTIONS',
      sessionDate: '2026-09-06',
      actualMinutes: 60,
    });

    const after = await getSatPrepOverview(repos, studentId, '2026-09-06');
    expect(after!.minutesLoggedThisWeek).toBe(60);
    expect(after!.sessions).toHaveLength(1);
  });

  it('returns null when no plan is active', async () => {
    const repos = await withTwoAttempts();
    expect(await getSatPrepOverview(repos, studentId, '2026-09-06')).toBeNull();
  });
});
