import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assessmentChapters, assessments, families } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzleAssessmentRepository } from './assessment-repository';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  await seedTestDatabase(db);
});

async function context() {
  const planning = createDrizzlePlanningRepository(db);
  const curriculum = createDrizzleCurriculumRepository(db);
  const [student] = await planning.listStudents();
  const [year] = await planning.listAcademicYears(student!.id);
  const hierarchy = await curriculum.getHierarchy(year!.curriculumVersionId!);
  const chapterId = (key: string) =>
    hierarchy.flatMap((s) => s.units).flatMap((u) => u.chapters).find((c) => c.key === key)!.id;
  const subjectId = (key: string) => hierarchy.find((s) => s.key === key)!.id;
  return { academicYearId: year!.id, chapterId, subjectId };
}

describe('drizzle assessment repository', () => {
  it('creates an assessment with its chapter scope and reads it back', async () => {
    const repo = createDrizzleAssessmentRepository(db);
    const { academicYearId, chapterId, subjectId } = await context();

    const created = await repo.createAssessment({
      academicYearId,
      subjectId: subjectId('PHY'),
      type: 'SCHOOL_UNIT_TEST',
      name: 'Unit test',
      examDate: '2026-09-20',
      maxMarks: 30,
      chapterIds: [chapterId('PHY01'), chapterId('PHY02'), chapterId('PHY01')],
    });
    expect(created.status).toBe('ANNOUNCED');
    expect(created.chapterIds).toHaveLength(2); // de-duplicated

    const back = await repo.getAssessment(created.id);
    expect(back?.chapterIds.sort()).toEqual([chapterId('PHY01'), chapterId('PHY02')].sort());
  });

  it('lists by exam date ascending and filters by range + status', async () => {
    const repo = createDrizzleAssessmentRepository(db);
    const { academicYearId, chapterId, subjectId } = await context();
    const base = {
      academicYearId,
      subjectId: subjectId('PHY'),
      type: 'SCHOOL_UNIT_TEST' as const,
      chapterIds: [chapterId('PHY01')],
    };
    await repo.createAssessment({ ...base, name: 'zz-B', examDate: '2026-10-05' });
    const a = await repo.createAssessment({ ...base, name: 'zz-A', examDate: '2026-09-15' });
    await repo.setStatus(a.id, 'CANCELLED');
    const mine = (list: { name: string }[]) => list.map((x) => x.name).filter((n) => n.startsWith('zz-'));

    const all = await repo.listAssessments(academicYearId, {});
    expect(mine(all)).toEqual(['zz-A', 'zz-B']); // exam-date order

    expect(mine(await repo.listAssessments(academicYearId, { status: 'ANNOUNCED' }))).toEqual([
      'zz-B',
    ]);
    expect(mine(await repo.listAssessments(academicYearId, { from: '2026-10-01' }))).toEqual([
      'zz-B',
    ]);
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleAssessmentRepository(db);
    const { academicYearId, chapterId, subjectId } = await context();
    await repo.createAssessment({
      academicYearId,
      subjectId: subjectId('PHY'),
      type: 'SCHOOL_UNIT_TEST',
      name: 'x',
      examDate: '2026-09-20',
      chapterIds: [chapterId('PHY01')],
    });

    await db.delete(families);
    expect(await db.select().from(assessments)).toHaveLength(0);
    expect(await db.select().from(assessmentChapters)).toHaveLength(0);
  });

  it('rejects a max-marks of zero (DB CHECK)', async () => {
    const { academicYearId, subjectId } = await context();
    await expect(
      db.insert(assessments).values({
        academicYearId,
        subjectId: subjectId('PHY'),
        type: 'SCHOOL_UNIT_TEST',
        name: 'bad',
        examDate: '2026-09-20',
        maxMarks: 0,
      }),
    ).rejects.toThrow();
  });

  it('the synthetic seed loaded three assessments', async () => {
    const repo = createDrizzleAssessmentRepository(db);
    const { academicYearId } = await context();
    const seeded = await repo.listAssessments(academicYearId, {});
    expect(seeded).toHaveLength(3);
    expect(await db.select().from(assessments).where(eq(assessments.status, 'ANNOUNCED'))).toHaveLength(3);
  });
});
