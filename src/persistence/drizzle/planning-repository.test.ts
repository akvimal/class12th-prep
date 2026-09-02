import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PlanDateOrderError } from '@/domain/planning/plan-dates';
import { academicYears, families, planPhases, preparationPlans, students } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let repo: ReturnType<typeof createDrizzlePlanningRepository>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  repo = createDrizzlePlanningRepository(db);
});

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

async function seedYear() {
  const family = await repo.createFamily({ name: 'Demo Family' });
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

describe('migration', () => {
  it('creates the TASK-002 tables on an empty database', async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    const names = (rows.rows ?? rows).map((r: { table_name: string }) => r.table_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'academic_years',
        'families',
        'plan_phases',
        'preparation_plans',
        'students',
      ]),
    );
  });
});

describe('seed smoke', () => {
  it('creates a family, student, academic year and plan, then activates it', async () => {
    const { year } = await seedYear();

    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    expect(plan.status).toBe('DRAFT');

    await repo.activatePlan(plan.id);
    expect((await repo.getPlan(plan.id))?.status).toBe('ACTIVE');
  });
});

describe('ownership and foreign keys', () => {
  it('rejects a student pointing at a non-existent family', async () => {
    await expect(
      db.insert(students).values({
        familyId: '00000000-0000-0000-0000-000000000000',
        displayName: 'Orphan',
        board: 'CBSE',
        grade: 12,
      }),
    ).rejects.toThrow();
  });

  it('cascades deletes from family down to plans and phases', async () => {
    const { family, year } = await seedYear();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    await db.insert(planPhases).values({
      preparationPlanId: plan.id,
      phaseType: 'FOUNDATION',
      startDate: '2026-09-02',
      endDate: '2026-09-30',
    });

    await db.delete(families).where(eq(families.id, family.id));

    expect(await db.select().from(students)).toHaveLength(0);
    expect(await db.select().from(academicYears)).toHaveLength(0);
    expect(await db.select().from(preparationPlans)).toHaveLength(0);
    expect(await db.select().from(planPhases)).toHaveLength(0);
  });

  it('enforces the grade range', async () => {
    const family = await repo.createFamily({ name: 'F' });
    await expect(
      db.insert(students).values({
        familyId: family.id,
        displayName: 'Too old',
        board: 'CBSE',
        grade: 15,
      }),
    ).rejects.toThrow();
  });
});

describe('plan date ordering', () => {
  it('is rejected by the domain guard in createPlan', async () => {
    const { year } = await seedYear();
    await expect(
      repo.createPlan({ academicYearId: year.id, ...shortPlan, syllabusTargetDate: '2026-08-01' }),
    ).rejects.toBeInstanceOf(PlanDateOrderError);
  });

  it('is also rejected by the database CHECK constraint on a raw insert', async () => {
    const { year } = await seedYear();
    await expect(
      db.insert(preparationPlans).values({
        academicYearId: year.id,
        ...shortPlan,
        examWindowEnd: '2026-01-01',
      }),
    ).rejects.toThrow();
  });
});

describe('one active plan per academic year', () => {
  it('archives the previously active plan when another is activated', async () => {
    const { year } = await seedYear();
    const a = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    const b = await repo.createPlan({ academicYearId: year.id, ...shortPlan });

    await repo.activatePlan(a.id);
    await repo.activatePlan(b.id);

    expect((await repo.getPlan(a.id))?.status).toBe('ARCHIVED');
    expect((await repo.getPlan(b.id))?.status).toBe('ACTIVE');
  });

  it('lets an ARCHIVED (historical) plan and an ACTIVE plan coexist for one year', async () => {
    const { year } = await seedYear();
    const historical = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    const current = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    await repo.activatePlan(historical.id);
    await repo.activatePlan(current.id);

    const active = await db
      .select()
      .from(preparationPlans)
      .where(eq(preparationPlans.status, 'ACTIVE'));
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(current.id);
  });

  it('rejects a second ACTIVE row inserted directly (partial unique index)', async () => {
    const { year } = await seedYear();
    await db.insert(preparationPlans).values({ academicYearId: year.id, ...shortPlan, status: 'ACTIVE' });
    await expect(
      db.insert(preparationPlans).values({ academicYearId: year.id, ...shortPlan, status: 'ACTIVE' }),
    ).rejects.toThrow();
  });
});

describe('multi-tenancy', () => {
  it('keeps two families and their students independent', async () => {
    const f1 = await repo.createFamily({ name: 'Family One' });
    const f2 = await repo.createFamily({ name: 'Family Two' });
    await repo.createStudent({ familyId: f1.id, displayName: 'A1', board: 'CBSE', grade: 12 });
    await repo.createStudent({ familyId: f1.id, displayName: 'A2', board: 'CBSE', grade: 11 });
    await repo.createStudent({ familyId: f2.id, displayName: 'B1', board: 'CBSE', grade: 12 });

    expect(await repo.listStudentsByFamily(f1.id)).toHaveLength(2);
    expect(await repo.listStudentsByFamily(f2.id)).toHaveLength(1);
  });
});

describe('active-profile resolution', () => {
  it('lists students, orders academic years newest-first, and finds the active plan', async () => {
    const { student, year } = await seedYear();
    await repo.createAcademicYear({
      studentId: student.id,
      yearLabel: '2025-26',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
    });

    const students = await repo.listStudents();
    expect(students).toHaveLength(1);
    expect(students[0]).toMatchObject({ displayName: 'Demo Student', board: 'CBSE', grade: 12 });

    const years = await repo.listAcademicYears(student.id);
    expect(years.map((y) => y.yearLabel)).toEqual(['2026-27', '2025-26']);

    expect(await repo.getActivePlan(year.id)).toBeNull();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shortPlan });
    await repo.activatePlan(plan.id);
    expect((await repo.getActivePlan(year.id))?.id).toBe(plan.id);
  });
});
