import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importCurriculum } from '@/app-services/curriculum-import';
import { createDrizzleCurriculumRepository } from '@/persistence/drizzle/curriculum-repository';
import { syntheticCurriculum } from '@/persistence/testing/curriculum-fixture';
import { createTestDatabase } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let planning: ReturnType<typeof createDrizzlePlanningRepository>;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  planning = createDrizzlePlanningRepository(db);
});
afterEach(() => close());

async function scenario() {
  const curriculum = createDrizzleCurriculumRepository(db);
  const { versionId } = await importCurriculum(curriculum, syntheticCurriculum);
  const tree = await curriculum.getHierarchy(versionId);
  const physics = tree[0]!;
  const maths = tree[1]!;

  const family = await planning.createFamily({ name: 'F' });
  const student = await planning.createStudent({
    familyId: family.id,
    displayName: 'S',
    board: 'CBSE',
    grade: 12,
  });
  const year = await planning.createAcademicYear({
    studentId: student.id,
    yearLabel: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  });
  await planning.setAcademicYearCurriculum(year.id, versionId);
  return { versionId, year, physics, maths };
}

describe('subject enrollment', () => {
  it('enrols subjects with target marks and leaves the board exam date null until known', async () => {
    const { year, physics } = await scenario();

    const { id } = await planning.enrollSubject({
      academicYearId: year.id,
      subjectId: physics.id,
      theoryMaxMarks: 70,
      practicalMaxMarks: 30,
      targetMarks: 80,
    });

    const [enrollment] = await planning.listEnrollments(year.id);
    expect(enrollment).toMatchObject({ id, targetMarks: 80, boardExamDate: null, enabled: true });
  });

  it('supports a subject-specific board exam date set later', async () => {
    const { year, maths } = await scenario();
    const { id } = await planning.enrollSubject({ academicYearId: year.id, subjectId: maths.id });

    const updated = await planning.updateEnrollment(id, { boardExamDate: '2027-03-05' });
    expect(updated.boardExamDate).toBe('2027-03-05');
  });

  it('can disable a subject that exists in the curriculum but is not taken', async () => {
    const { year, physics } = await scenario();
    const { id } = await planning.enrollSubject({
      academicYearId: year.id,
      subjectId: physics.id,
      enabled: false,
    });
    expect((await planning.listEnrollments(year.id))[0]?.enabled).toBe(false);
    await planning.updateEnrollment(id, { enabled: true });
    expect((await planning.listEnrollments(year.id))[0]?.enabled).toBe(true);
  });

  it('rejects enrolling the same subject twice for one academic year', async () => {
    const { year, physics } = await scenario();
    await planning.enrollSubject({ academicYearId: year.id, subjectId: physics.id });
    await expect(
      planning.enrollSubject({ academicYearId: year.id, subjectId: physics.id }),
    ).rejects.toThrow();
  });

  it('rejects a negative target-marks value', async () => {
    const { year, physics } = await scenario();
    await expect(
      planning.enrollSubject({ academicYearId: year.id, subjectId: physics.id, targetMarks: -5 }),
    ).rejects.toThrow();
  });
});
