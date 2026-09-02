import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planPhases } from '@/persistence/schema';
import { createTestDatabase } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let repo: ReturnType<typeof createDrizzlePlanningRepository>;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  repo = createDrizzlePlanningRepository(db);
});
afterEach(() => close());

const shapes = {
  short: {
    startDate: '2026-09-02',
    syllabusTargetDate: '2026-12-20',
    hardCompletionDate: '2026-12-31',
    revisionStartDate: '2027-01-01',
    examWindowStart: '2027-02-01',
    examWindowEnd: '2027-03-31',
    weekdayCapacityMinutes: 120,
    weekendCapacityMinutes: 240,
  },
  julyToFeb: {
    startDate: '2025-07-01',
    syllabusTargetDate: '2025-12-15',
    hardCompletionDate: '2026-01-05',
    revisionStartDate: '2026-01-06',
    examWindowStart: '2026-02-10',
    examWindowEnd: '2026-03-20',
    weekdayCapacityMinutes: 90,
    weekendCapacityMinutes: 180,
  },
  ninetyDay: {
    startDate: '2026-11-01',
    syllabusTargetDate: '2026-12-20',
    hardCompletionDate: '2026-12-28',
    revisionStartDate: '2026-12-29',
    examWindowStart: '2027-01-25',
    examWindowEnd: '2027-01-30',
    weekdayCapacityMinutes: 180,
    weekendCapacityMinutes: 300,
  },
};

async function aYear() {
  const family = await repo.createFamily({ name: 'F' });
  const student = await repo.createStudent({
    familyId: family.id,
    displayName: 'S',
    board: 'CBSE',
    grade: 12,
  });
  return repo.createAcademicYear({
    studentId: student.id,
    yearLabel: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  });
}

describe('plan phase generation', () => {
  it.each(Object.entries(shapes))('creates and phase-resolves the %s plan shape', async (_name, shape) => {
    const year = await aYear();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shape });

    const phases = await repo.getPlanPhases(plan.id);
    expect(phases.map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);
    // contiguous
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i]!.startDate).toBe(phases[i - 1]!.endDate);
    }
    expect(await repo.resolveCurrentPhase(plan.id, shape.startDate)).toBe('SYLLABUS_COVERAGE');
    expect(await repo.resolveCurrentPhase(plan.id, shape.examWindowStart)).toBe('BOARD_EXAM');
  });

  it('regenerates phases when the syllabus target date changes', async () => {
    const year = await aYear();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shapes.short });
    expect(await repo.resolveCurrentPhase(plan.id, '2026-12-01')).toBe('SYLLABUS_COVERAGE');

    await repo.updatePlan(plan.id, { syllabusTargetDate: '2026-11-15' });

    expect(await repo.resolveCurrentPhase(plan.id, '2026-12-01')).toBe('CONSOLIDATION');
    // old phase rows are replaced, not accumulated
    const rows = await db.select().from(planPhases).where(eq(planPhases.preparationPlanId, plan.id));
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => (r.configJson as { configVersion: string }).configVersion === 'phases-v1')).toBe(
      true,
    );
  });

  it('rejects an update that puts the dates out of order and leaves phases untouched', async () => {
    const year = await aYear();
    const plan = await repo.createPlan({ academicYearId: year.id, ...shapes.short });
    const before = await repo.getPlanPhases(plan.id);

    await expect(repo.updatePlan(plan.id, { revisionStartDate: '2026-06-01' })).rejects.toThrow();

    expect(await repo.getPlanPhases(plan.id)).toEqual(before);
  });
});
