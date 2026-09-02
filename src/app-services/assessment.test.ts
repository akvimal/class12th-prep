import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { AssessmentError } from '@/domain/assessment/assessment';
import { seedSynthetic } from './seed';
import { addAssessment, listUpcomingAssessments, nextSchoolTestDaysByChapter } from './assessment';
import { chapterIdForKey } from './progress';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

const draft = {
  type: 'SCHOOL_UNIT_TEST' as const,
  name: 'Physics unit test',
  examDate: '2026-09-20',
  maxMarks: 30,
  subjectKey: 'PHY',
  chapterKeys: ['PHY01', 'PHY02'],
};

describe('addAssessment', () => {
  it('resolves subject + chapter keys and stores the assessment', async () => {
    const { repos, academicYearId } = await seeded();
    const created = await addAssessment(repos, academicYearId, draft);
    expect(created?.status).toBe('ANNOUNCED');
    expect(created?.chapterIds).toHaveLength(2);

    const back = await repos.assessment.getAssessment(created!.id);
    expect(back?.name).toBe('Physics unit test');
  });

  it('rejects a chapter that is not in the chosen subject', async () => {
    const { repos, academicYearId } = await seeded();
    await expect(
      addAssessment(repos, academicYearId, { ...draft, chapterKeys: ['PHY01', 'CHE01'] }),
    ).rejects.toThrow(/CHE01/);
  });

  it('rejects an empty chapter list via the domain guard', async () => {
    const { repos, academicYearId } = await seeded();
    await expect(
      addAssessment(repos, academicYearId, { ...draft, chapterKeys: [] }),
    ).rejects.toBeInstanceOf(AssessmentError);
  });
});

describe('listUpcomingAssessments', () => {
  it('returns ANNOUNCED tests on/after asOf, soonest first, with names and daysUntil', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, { ...draft, examDate: '2026-09-25' });
    await addAssessment(repos, academicYearId, {
      ...draft,
      name: 'Maths class test',
      subjectKey: 'MAT',
      chapterKeys: ['MAT02'],
      examDate: '2026-09-11',
    });
    // already-seeded synthetic assessments exist too; a past one is excluded
    const list = await listUpcomingAssessments(repos, academicYearId, '2026-09-12');
    expect(list.every((a) => a.examDate >= '2026-09-12')).toBe(true);
    expect(list.map((a) => a.daysUntil)).toEqual(
      [...list.map((a) => a.daysUntil)].sort((x, y) => x - y),
    );
    const maths = list.find((a) => a.name === 'Maths class test');
    expect(maths).toBeUndefined(); // 09-11 is before asOf
    const phys = list.find((a) => a.examDate === '2026-09-25');
    expect(phys?.subjectName).toBe('Physics');
    expect(phys?.chapters.map((c) => c.name)).toEqual(['Electrostatics', 'Current Electricity']);
  });
});

describe('nextSchoolTestDaysByChapter', () => {
  it('maps each covered chapter to the fewest days until a school test', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, {
      ...draft,
      chapterKeys: ['PHY01'],
      examDate: '2026-09-20',
    });
    await addAssessment(repos, academicYearId, {
      ...draft,
      name: 'earlier',
      chapterKeys: ['PHY01'],
      examDate: '2026-09-14',
    });

    const map = await nextSchoolTestDaysByChapter(repos, academicYearId, '2026-09-09');
    const phy01 = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
    expect(map.get(phy01)).toBe(5); // 09-14 wins over 09-20
  });

  it('ignores self-practice assessment types', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, {
      ...draft,
      type: 'SELF_TEST',
      chapterKeys: ['PHY03'],
      examDate: '2026-09-12',
    });
    const map = await nextSchoolTestDaysByChapter(repos, academicYearId, '2026-09-09');
    const phy03 = (await chapterIdForKey(repos, academicYearId, 'PHY03'))!;
    expect(map.has(phy03)).toBe(false);
  });
});
