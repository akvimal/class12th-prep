import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { getParentSummary } from './parent';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('getParentSummary', () => {
  it('is a projection: readiness, risk, consistency, upcoming tests — no logs', async () => {
    const { repos, academicYearId, planId } = await seeded();
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'Physics test',
      examDate: '2026-09-06',
      subjectKey: 'PHY',
      chapterKeys: ['PHY01'],
    });

    const s = await getParentSummary(repos, academicYearId, planId, 'Asha', '2026-09-02');
    expect(s).not.toBeNull();
    expect(s!.studentName).toBe('Asha');
    expect(typeof s!.onTrack).toBe('boolean');
    expect(s!.subjects).toHaveLength(4);
    expect(s!.subjects[0]).toEqual({
      name: expect.any(String),
      readiness: expect.any(Number),
    });
    expect(s!.upcomingTests.map((t) => t.name)).toContain('Physics test');

    // the seed has study sessions on 2026-08-28..09-01
    expect(s!.revisionDays).toHaveLength(7);
    expect(s!.revisionDays.at(-1)!.date).toBe('2026-09-02');
    expect(s!.studiedDaysLast7).toBeGreaterThan(0);

    // the shape carries no session-level detail
    expect(JSON.stringify(s)).not.toMatch(/actualMinutes|sessionDate|conceptScore/);
  });

  it('returns null for an unknown plan', async () => {
    const { repos, academicYearId } = await seeded();
    expect(
      await getParentSummary(
        repos,
        academicYearId,
        '00000000-0000-0000-0000-000000000000',
        'X',
        '2026-09-02',
      ),
    ).toBeNull();
  });
});
