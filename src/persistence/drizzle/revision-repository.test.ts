import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { families, revisionSchedules } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleRevisionRepository } from './revision-repository';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  await seedTestDatabase(db);
  // The seed schedules a first revision for every learned chapter; these tests
  // start from a clean revision slate.
  await db.delete(revisionSchedules);
});

async function ctx() {
  const planning = createDrizzlePlanningRepository(db);
  const curriculum = createDrizzleCurriculumRepository(db);
  const [student] = await planning.listStudents();
  const [year] = await planning.listAcademicYears(student!.id);
  const hierarchy = await curriculum.getHierarchy(year!.curriculumVersionId!);
  const chapterId = (key: string) =>
    hierarchy.flatMap((s) => s.units).flatMap((u) => u.chapters).find((c) => c.key === key)!.id;
  return { academicYearId: year!.id, chapterId };
}

describe('drizzle revision repository', () => {
  it('allows one active schedule per chapter and appends history', async () => {
    const repo = createDrizzleRevisionRepository(db);
    const { academicYearId, chapterId } = await ctx();
    const phy = chapterId('PHY01');

    const r1 = await repo.schedule({
      academicYearId,
      chapterId: phy,
      revisionNumber: 1,
      dueDate: '2026-09-03',
      method: 'ACTIVE_RECALL',
    });
    expect(r1.status).toBe('SCHEDULED');

    await expect(
      repo.schedule({
        academicYearId,
        chapterId: phy,
        revisionNumber: 2,
        dueDate: '2026-09-10',
        method: 'PYQ',
      }),
    ).rejects.toThrow(); // partial unique index

    await repo.complete(r1.id, { outcome: 'MODERATE', completedOn: '2026-09-03' });
    // now a second SCHEDULED row is allowed
    const r2 = await repo.schedule({
      academicYearId,
      chapterId: phy,
      revisionNumber: 2,
      dueDate: '2026-09-06',
      method: 'PYQ',
    });

    expect((await repo.getActive(academicYearId, phy))?.id).toBe(r2.id);
    expect(await repo.listSchedules(academicYearId, { chapterId: phy })).toHaveLength(2);
  });

  it('filters by status and due date, ordered by due date', async () => {
    const repo = createDrizzleRevisionRepository(db);
    const { academicYearId, chapterId } = await ctx();
    await repo.schedule({
      academicYearId,
      chapterId: chapterId('PHY01'),
      revisionNumber: 1,
      dueDate: '2026-09-10',
      method: 'ACTIVE_RECALL',
    });
    await repo.schedule({
      academicYearId,
      chapterId: chapterId('CHE01'),
      revisionNumber: 1,
      dueDate: '2026-09-04',
      method: 'ACTIVE_RECALL',
    });

    const due = await repo.listSchedules(academicYearId, {
      status: 'SCHEDULED',
      dueOnOrBefore: '2026-09-05',
    });
    expect(due).toHaveLength(1);
    expect(due[0]!.dueDate).toBe('2026-09-04');
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleRevisionRepository(db);
    const { academicYearId, chapterId } = await ctx();
    await repo.schedule({
      academicYearId,
      chapterId: chapterId('PHY01'),
      revisionNumber: 1,
      dueDate: '2026-09-03',
      method: 'ACTIVE_RECALL',
    });
    await db.delete(families);
    expect(await db.select().from(revisionSchedules)).toHaveLength(0);
  });
});
