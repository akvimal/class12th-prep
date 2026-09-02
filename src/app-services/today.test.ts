import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { buildDailyCandidates } from './candidates';
import { getTodayPlan } from './today';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('buildDailyCandidates', () => {
  it('produces one candidate per in-play chapter with priority inputs from real data', async () => {
    const { repos, academicYearId } = await seeded();
    const candidates = await buildDailyCandidates(repos, academicYearId, '2026-09-02');

    expect(candidates.length).toBeGreaterThan(0);
    const rayOptics = candidates.find((c) => c.chapterKey === 'PHY03'); // NOT_TAUGHT in the seed
    expect(rayOptics?.priority.effectiveReadiness).toBe(38);
    // NOT_TAUGHT with no imminent test → left alone
    expect(rayOptics?.prerequisitesMet).toBe(false);
  });

  it('makes an untaught chapter eligible once a school test is within two weeks', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'Optics test',
      examDate: '2026-09-12',
      subjectKey: 'PHY',
      chapterKeys: ['PHY03'],
    });
    const candidates = await buildDailyCandidates(repos, academicYearId, '2026-09-02');
    const rayOptics = candidates.find((c) => c.chapterKey === 'PHY03');
    expect(rayOptics?.prerequisitesMet).toBe(true);
    expect(rayOptics?.priority.daysUntilSchoolTest).toBe(10);
  });
});

describe('getTodayPlan', () => {
  it('returns a deterministic ≤3-task plan sized to the day capacity', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const a = await getTodayPlan(repos, academicYearId, planId, '2026-09-02', 'OK');
    const b = await getTodayPlan(repos, academicYearId, planId, '2026-09-02', 'OK');

    expect(a).toEqual(b);
    expect(a!.primary.length).toBeLessThanOrEqual(3);
    expect(a!.capacityMinutes).toBe(120); // seed weekday capacity, 2026-09-02 is a Wednesday
    expect(a!.algorithmVersion).toBe('planner-v1');
  });

  it('lower energy trims the target', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const ok = await getTodayPlan(repos, academicYearId, planId, '2026-09-02', 'OK');
    const low = await getTodayPlan(repos, academicYearId, planId, '2026-09-02', 'LOW');
    expect(low!.targetMinutes).toBeLessThan(ok!.targetMinutes);
  });

  it('a school test in 2 days pulls that chapter into the primary set', async () => {
    const { repos, academicYearId, planId } = await seeded();
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'Amines test',
      examDate: '2026-09-04',
      subjectKey: 'CHE',
      chapterKeys: ['CHE03'],
    });
    const plan = await getTodayPlan(repos, academicYearId, planId, '2026-09-02', 'OK');
    expect(plan!.primary.map((t) => t.candidate.chapterKey)).toContain('CHE03');
  });

  it('returns null for an unknown plan', async () => {
    const { repos, academicYearId } = await seeded();
    expect(
      await getTodayPlan(
        repos,
        academicYearId,
        '00000000-0000-0000-0000-000000000000',
        '2026-09-02',
      ),
    ).toBeNull();
  });
});
