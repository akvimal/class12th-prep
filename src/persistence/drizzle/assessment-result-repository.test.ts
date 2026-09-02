import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assessmentResults, families, questionErrors } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzleAssessmentRepository } from './assessment-repository';
import { createDrizzleAssessmentResultRepository } from './assessment-result-repository';
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

async function makeAssessment() {
  const planning = createDrizzlePlanningRepository(db);
  const curriculum = createDrizzleCurriculumRepository(db);
  const assessmentRepo = createDrizzleAssessmentRepository(db);
  const [student] = await planning.listStudents();
  const [year] = await planning.listAcademicYears(student!.id);
  const hierarchy = await curriculum.getHierarchy(year!.curriculumVersionId!);
  const phy = hierarchy.find((s) => s.key === 'PHY')!;
  const chapterId = (key: string) =>
    phy.units.flatMap((u) => u.chapters).find((c) => c.key === key)!.id;

  const a = await assessmentRepo.createAssessment({
    academicYearId: year!.id,
    subjectId: phy.id,
    type: 'SCHOOL_UNIT_TEST',
    name: 'Unit test',
    examDate: '2026-09-07',
    maxMarks: 30,
    chapterIds: [chapterId('PHY01'), chapterId('PHY02')],
  });
  return { academicYearId: year!.id, assessmentId: a.id, subjectId: phy.id, chapterId };
}

describe('drizzle assessment-result repository', () => {
  it('records a result with errors in one transaction and reads it back', async () => {
    const repo = createDrizzleAssessmentResultRepository(db);
    const { assessmentId, subjectId, chapterId } = await makeAssessment();

    const result = await repo.recordResult({
      assessmentId,
      score: 22,
      maxMarks: 30,
      timeTakenMinutes: 50,
      errors: [
        {
          subjectId,
          chapterId: chapterId('PHY01'),
          marksLost: 3,
          errorType: 'CALCULATION',
        },
        { subjectId, chapterId: chapterId('PHY02'), marksLost: 5, errorType: 'CONCEPT' },
      ],
    });
    expect(result.errors).toHaveLength(2);

    const back = await repo.getResult(assessmentId);
    expect(back?.score).toBe(22);
    expect(back?.errors.map((e) => e.errorType).sort()).toEqual(['CALCULATION', 'CONCEPT']);

    await expect(
      repo.recordResult({ assessmentId, score: 1, maxMarks: 30, errors: [] }),
    ).rejects.toThrow(); // unique(assessment_id)
  });

  it('lists errors scoped to the academic year and advances state', async () => {
    const repo = createDrizzleAssessmentResultRepository(db);
    const { academicYearId, assessmentId, subjectId, chapterId } = await makeAssessment();
    const r = await repo.recordResult({
      assessmentId,
      score: 24,
      maxMarks: 30,
      errors: [{ subjectId, chapterId: chapterId('PHY01'), marksLost: 6, errorType: 'CONCEPT' }],
    });

    const list = await repo.listErrors(academicYearId, { state: 'NEW' });
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(r.errors[0]!.id);

    const reviewed = await repo.advanceError(r.errors[0]!.id, 'REVIEW');
    expect(reviewed.state).toBe('REVIEWED');
    expect(await repo.listErrors(academicYearId, { state: 'NEW' })).toHaveLength(0);
  });

  it('a score above max is rejected by the CHECK constraint', async () => {
    const { assessmentId } = await makeAssessment();
    await expect(
      db.insert(assessmentResults).values({ assessmentId, score: 40, maxMarks: 30 }),
    ).rejects.toThrow();
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleAssessmentResultRepository(db);
    const { assessmentId, subjectId, chapterId } = await makeAssessment();
    await repo.recordResult({
      assessmentId,
      score: 20,
      maxMarks: 30,
      errors: [{ subjectId, chapterId: chapterId('PHY01'), marksLost: 4, errorType: 'CONCEPT' }],
    });
    await db.delete(families);
    expect(await db.select().from(assessmentResults)).toHaveLength(0);
    expect(await db.select().from(questionErrors)).toHaveLength(0);
  });
});
