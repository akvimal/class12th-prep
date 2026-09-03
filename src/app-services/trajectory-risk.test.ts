import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { detectDailyEvents, listEvents } from './events';
import { getTrajectoryRisks } from './trajectory-risk';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('getTrajectoryRisks', () => {
  it('is quiet early in the plan', async () => {
    const { repos, academicYearId, planId } = await seeded();
    expect(await getTrajectoryRisks(repos, academicYearId, planId, '2026-09-05')).toEqual([]);
  });

  it('raises risk before the hard deadline when the syllabus is far behind late in the window', async () => {
    const { repos, academicYearId, planId } = await seeded();
    // 2026-12-15 — plan window nearly done, seed readiness ~mid-40s weighted
    const risks = (await getTrajectoryRisks(repos, academicYearId, planId, '2026-12-15'))!;
    expect(risks.length).toBeGreaterThan(0);
    expect(risks.map((r) => r.type)).toEqual(expect.arrayContaining(['PLAN_AT_RISK']));
    // detected while asOf is still before the hard completion date (2026-12-31)
    expect(risks.every((r) => r.algorithmVersion === 'trajectory-risk-v1')).toBe(true);
  });

  it('returns null for an unknown plan', async () => {
    const { repos, academicYearId } = await seeded();
    expect(
      await getTrajectoryRisks(
        repos,
        academicYearId,
        '00000000-0000-0000-0000-000000000000',
        '2026-12-15',
      ),
    ).toBeNull();
  });
});

describe('detectDailyEvents — trajectory risk', () => {
  it('emits a risk event once per severity level', async () => {
    const { repos, academicYearId } = await seeded();
    await detectDailyEvents(repos, academicYearId, '2026-12-15');
    await detectDailyEvents(repos, academicYearId, '2026-12-16'); // same severity next day

    const events = (await listEvents(repos, academicYearId))!.filter((e) =>
      ['PLAN_AT_RISK', 'SYLLABUS_TARGET_AT_RISK'].includes(e.eventType),
    );
    expect(events.length).toBeGreaterThan(0);
    // no duplicate (type, severity) pairs
    const keys = events.map(
      (e) => `${e.eventType}:${(e.payload as { severity: string }).severity}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(events.every((e) => e.deliveryStatus === 'PENDING')).toBe(true);
  });
});
