import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { buildDailyCandidates } from './candidates';
import { applyCourseCorrection, getCourseCorrections } from './course-correction';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, planId: seed.planId! };
}

describe('getCourseCorrections', () => {
  it('returns no corrections when the plan is comfortable', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const v = await getCourseCorrections(repos, academicYearId, planId, '2026-09-05');
    expect(v!.corrections).toEqual([]);
  });

  it('proposes levers when the plan is under pressure', async () => {
    const { repos, academicYearId, planId } = await seeded();
    const v = (await getCourseCorrections(repos, academicYearId, planId, '2026-12-19'))!;
    expect(['HIGH', 'CRITICAL']).toContain(v.pressureBand);
    expect(v.corrections.map((c) => c.kind)).toContain('REPRIORITISE');
    expect(v.corrections.some((c) => c.kind === 'ADD_CAPACITY' && c.requiresConfirmation)).toBe(
      true,
    );
  });
});

describe('applyCourseCorrection', () => {
  it('REPRIORITISE changes no plan dates', async () => {
    const { repos, planId } = await seeded();
    const before = await repos.planning.getPlan(planId);
    const r = await applyCourseCorrection(repos, planId, 'REPRIORITISE', {});
    expect(r.applied).toBe(true);
    expect(await repos.planning.getPlan(planId)).toEqual(before);
  });

  it('ADD_CAPACITY raises the weekday capacity', async () => {
    const { repos, planId } = await seeded();
    const before = (await repos.planning.getPlan(planId))!.weekdayCapacityMinutes;
    await applyCourseCorrection(repos, planId, 'ADD_CAPACITY', { weekdayMinutesDelta: 30 });
    expect((await repos.planning.getPlan(planId))!.weekdayCapacityMinutes).toBe(before + 30);
  });

  it('MOVE_TARGET shifts the coverage window forward, keeping the ordering valid', async () => {
    const { repos, planId } = await seeded();
    const before = (await repos.planning.getPlan(planId))!;
    const r = await applyCourseCorrection(repos, planId, 'MOVE_TARGET', { targetShiftDays: 7 });
    expect(r.applied).toBe(true);
    const after = (await repos.planning.getPlan(planId))!;
    expect(after.syllabusTargetDate > before.syllabusTargetDate).toBe(true);
    expect(after.revisionStartDate > before.revisionStartDate).toBe(true);
    expect(after.syllabusTargetDate <= after.hardCompletionDate).toBe(true);
  });
});

describe('subject exam drop-off (scenario 16)', () => {
  it('a subject stops being planned once its board paper is past', async () => {
    const { repos, academicYearId } = await seeded();
    const year = await repos.planning.getAcademicYear(academicYearId);
    const hierarchy = await repos.curriculum.getHierarchy(year!.curriculumVersionId!);
    const phySubjectId = hierarchy.find((s) => s.key === 'PHY')!.id;
    const enrollments = await repos.planning.listEnrollments(academicYearId);
    const phyEnrollment = enrollments.find((e) => e.subjectId === phySubjectId)!;

    const withPhy = await buildDailyCandidates(repos, academicYearId, '2027-02-20');
    expect(withPhy.some((c) => c.subjectKey === 'PHY')).toBe(true);

    await repos.planning.updateEnrollment(phyEnrollment.id, { boardExamDate: '2027-02-18' });

    const afterExam = await buildDailyCandidates(repos, academicYearId, '2027-02-20');
    expect(afterExam.some((c) => c.subjectKey === 'PHY')).toBe(false);
    // other subjects are unaffected
    expect(afterExam.some((c) => c.subjectKey === 'MAT')).toBe(true);
    // still planned the day before the exam
    const dayBefore = await buildDailyCandidates(repos, academicYearId, '2027-02-17');
    expect(dayBefore.some((c) => c.subjectKey === 'PHY')).toBe(true);
  });
});
