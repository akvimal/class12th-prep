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
});
