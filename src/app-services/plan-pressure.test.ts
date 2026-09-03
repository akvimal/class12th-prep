import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { PLAN_PRESSURE_BANDS } from '@/domain/planning/plan-pressure';
import { seedSynthetic } from './seed';
import { getPlanPressure } from './plan-pressure';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('getPlanPressure', () => {
  it('reports a band with drivers over the full plan window', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const p = await getPlanPressure(repos, academicYearId, planId, '2026-09-03');
    expect(p).not.toBeNull();
    expect(PLAN_PRESSURE_BANDS).toContain(p!.band);
    expect(p!.drivers.length).toBeGreaterThan(0);
    expect(p!.algorithmVersion).toBe('plan-pressure-v1');
  });

  it('reports pressure without silently exceeding capacity when time runs out', async () => {
    const { repos, academicYearId, planId } = await seeded();
    // one day before the syllabus target with the syllabus still open
    const p = (await getPlanPressure(repos, academicYearId, planId, '2026-12-19'))!;
    expect(['HIGH', 'CRITICAL']).toContain(p.band);
    expect(p.deficitMinutes).toBeGreaterThan(0);
    // the deficit is surfaced as trade-offs, not absorbed
    expect(p.tradeoffs.length).toBeGreaterThan(0);
    expect(p.demandMinutes).toBeGreaterThan(p.capacityMinutes);
  });

  it('returns null for an unknown plan', async () => {
    const { repos, academicYearId } = await seeded();
    expect(
      await getPlanPressure(
        repos,
        academicYearId,
        '00000000-0000-0000-0000-000000000000',
        '2026-09-03',
      ),
    ).toBeNull();
  });
});
