import { describe, expect, it } from 'vitest';
import {
  getAcademicYearReadiness,
  getChapterReadiness,
  recalculateAcademicYearReadiness,
} from '@/app-services/readiness';
import { seedSynthetic } from '@/app-services/seed';
import { createInMemoryRepositories } from '@/persistence/in-memory';

describe('in-memory readiness', () => {
  it('mirrors the drizzle repo: seeded snapshots, recalc appends, history preserved', async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);
    const yearId = seed.academicYearId!;

    expect(seed.counts?.readinessSnapshots).toBe(12);
    expect((await getAcademicYearReadiness(repos, yearId))!).toHaveLength(12);

    const chapterId = (await getAcademicYearReadiness(repos, yearId))![0]!.scopeId;
    const before = await getChapterReadiness(repos, yearId, chapterId);
    expect(before!.history).toHaveLength(1);

    await recalculateAcademicYearReadiness(repos, yearId, { asOf: '2026-10-01' });
    const after = await getChapterReadiness(repos, yearId, chapterId);
    expect(after!.history).toHaveLength(2);
    expect(after!.latest!.calculatedFor).toBe('2026-10-01');
    expect(after!.history[1]).toEqual(before!.history[0]); // original untouched
  });

  it('returns null for an unknown academic year', async () => {
    const repos = createInMemoryRepositories();
    expect(await getAcademicYearReadiness(repos, 'missing')).toBeNull();
    expect(await recalculateAcademicYearReadiness(repos, 'missing')).toBeNull();
    expect(await getChapterReadiness(repos, 'missing', 'x')).toBeNull();
  });
});
