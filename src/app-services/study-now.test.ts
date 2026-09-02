import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { getStudyNow } from './study-now';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

describe('getStudyNow', () => {
  it('returns one deterministic task with a micro-plan sized to the minutes', async () => {
    const { repos, academicYearId } = await seeded();
    const a = await getStudyNow(repos, academicYearId, '2026-09-02', 45);
    const b = await getStudyNow(repos, academicYearId, '2026-09-02', 45);

    expect(a).toEqual(b);
    expect(a!.task).not.toBeNull();
    expect(a!.task!.minutes).toBeLessThanOrEqual(45);
    expect(a!.microPlan.length).toBeGreaterThanOrEqual(2);
    expect(a!.microPlan.at(-1)!.toMinute).toBe(a!.task!.minutes);
  });

  it('an imminent school test steers the pick', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'CS test',
      examDate: '2026-09-04',
      subjectKey: 'CS',
      chapterKeys: ['CS03'],
    });
    const r = await getStudyNow(repos, academicYearId, '2026-09-02', 60);
    expect(r!.task!.candidate.chapterKey).toBe('CS03');
  });

  it('returns null for an unknown academic year', async () => {
    const { repos } = await seeded();
    expect(
      await getStudyNow(repos, '00000000-0000-0000-0000-000000000000', '2026-09-02', 45),
    ).toBeNull();
  });
});
