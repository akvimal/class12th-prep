import { describe, expect, it } from 'vitest';
import { PlanDateOrderError } from '@/domain/planning/plan-dates';
import { createInMemoryPlanningRepository } from './planning-repository';

const shortPlan = {
  startDate: '2026-09-02',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-31',
  revisionStartDate: '2027-01-01',
  examWindowStart: '2027-02-01',
  examWindowEnd: '2027-03-31',
  weekdayCapacityMinutes: 120,
  weekendCapacityMinutes: 240,
};

async function seedYear(repo: ReturnType<typeof createInMemoryPlanningRepository>) {
  const family = await repo.createFamily({ name: 'Demo' });
  const student = await repo.createStudent({
    familyId: family.id,
    displayName: 'Demo Student',
    board: 'CBSE',
    grade: 12,
  });
  const year = await repo.createAcademicYear({
    studentId: student.id,
    yearLabel: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  });
  return { family, student, year };
}

describe('in-memory planning repository', () => {
  it('runs the seed smoke path', async () => {
    const repo = createInMemoryPlanningRepository();
    const { year } = await seedYear(repo);
    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    expect(plan.status).toBe('DRAFT');
    await repo.activatePlan(plan.id);
    expect((await repo.getPlan(plan.id))?.status).toBe('ACTIVE');
  });

  it('enforces plan date ordering', async () => {
    const repo = createInMemoryPlanningRepository();
    const { year } = await seedYear(repo);
    await expect(
      repo.createPlan({ academicYearId: year.id, ...shortPlan, revisionStartDate: '2026-01-01' }),
    ).rejects.toBeInstanceOf(PlanDateOrderError);
  });

  it('keeps a single active plan per academic year', async () => {
    const repo = createInMemoryPlanningRepository();
    const { year } = await seedYear(repo);
    const a = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    const b = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    await repo.activatePlan(a.id);
    await repo.activatePlan(b.id);
    expect((await repo.getPlan(a.id))?.status).toBe('ARCHIVED');
    expect((await repo.getPlan(b.id))?.status).toBe('ACTIVE');
  });

  it('scopes students to their family', async () => {
    const repo = createInMemoryPlanningRepository();
    const f1 = await repo.createFamily({ name: 'One' });
    const f2 = await repo.createFamily({ name: 'Two' });
    await repo.createStudent({ familyId: f1.id, displayName: 'A', board: 'CBSE', grade: 12 });
    await repo.createStudent({ familyId: f2.id, displayName: 'B', board: 'CBSE', grade: 12 });
    expect(await repo.listStudentsByFamily(f1.id)).toHaveLength(1);
  });

  it('resolves the active profile: students, years newest-first, active plan', async () => {
    const repo = createInMemoryPlanningRepository();
    const { student, year } = await seedYear(repo);

    expect((await repo.listStudents()).map((s) => s.displayName)).toEqual(['Demo Student']);

    const older = await repo.createAcademicYear({
      studentId: student.id,
      yearLabel: '2025-26',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
    });
    const years = await repo.listAcademicYears(student.id);
    expect(years.map((y) => y.id)).toEqual([year.id, older.id]);

    expect(await repo.getActivePlan(year.id)).toBeNull();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    await repo.activatePlan(plan.id);
    expect((await repo.getActivePlan(year.id))?.id).toBe(plan.id);
  });

  it('generates and regenerates phases like the drizzle repo', async () => {
    const repo = createInMemoryPlanningRepository();
    const { year } = await seedYear(repo);
    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });

    expect((await repo.getPlanPhases(plan.id)).map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);
    expect(await repo.resolveCurrentPhase(plan.id, '2026-12-01')).toBe('SYLLABUS_COVERAGE');

    await repo.updatePlan(plan.id, { syllabusTargetDate: '2026-11-15' });
    expect(await repo.resolveCurrentPhase(plan.id, '2026-12-01')).toBe('CONSOLIDATION');
  });

  it('handles subject enrollment and a later board exam date', async () => {
    const repo = createInMemoryPlanningRepository();
    const { year } = await seedYear(repo);
    const { id } = await repo.enrollSubject({
      academicYearId: year.id,
      subjectId: 'subject-1',
      targetMarks: 80,
    });
    expect((await repo.listEnrollments(year.id))[0]).toMatchObject({
      targetMarks: 80,
      boardExamDate: null,
    });

    await repo.updateEnrollment(id, { boardExamDate: '2027-03-05' });
    expect((await repo.listEnrollments(year.id))[0]?.boardExamDate).toBe('2027-03-05');

    await expect(
      repo.enrollSubject({ academicYearId: year.id, subjectId: 'subject-1' }),
    ).rejects.toThrow();
  });
});
