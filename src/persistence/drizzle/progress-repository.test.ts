import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ChapterProgressError } from '@/domain/progress/chapter-progress';
import { getCurriculumProgress } from '@/app-services/progress';
import { academicYears, chapterProgress, chapters } from '@/persistence/schema';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleProgressRepository } from './progress-repository';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';

let db: DrizzleDb;
let close: () => Promise<void>;
let academicYearId: string;
let curriculumVersionId: string;
let repos: {
  progress: ReturnType<typeof createDrizzleProgressRepository>;
  planning: ReturnType<typeof createDrizzlePlanningRepository>;
  curriculum: ReturnType<typeof createDrizzleCurriculumRepository>;
};

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  const seed = await seedTestDatabase(db);
  academicYearId = seed.academicYearId!;
  curriculumVersionId = seed.curriculumVersionId;
  repos = {
    progress: createDrizzleProgressRepository(db),
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
  };
});

async function firstChapterId() {
  const tree = await repos.curriculum.getHierarchy(curriculumVersionId);
  return tree[0]!.units[0]!.chapters[0]!.id;
}

describe('chapter progress', () => {
  it('the synthetic seed populated 12 rows', async () => {
    expect(await repos.progress.listChapterProgress(academicYearId)).toHaveLength(12);
  });

  it('setChapterProgress upserts — a second call updates the same row', async () => {
    const chapterId = await firstChapterId();

    await repos.progress.setChapterProgress(academicYearId, chapterId, { conceptScore: 30 });
    await repos.progress.setChapterProgress(academicYearId, chapterId, {
      conceptScore: 55,
      confidence: 'MODERATE',
    });

    const rows = await db
      .select()
      .from(chapterProgress)
      .where(eq(chapterProgress.chapterId, chapterId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ conceptScore: 55, confidence: 'MODERATE' });
  });

  it('rejects an out-of-range score at the domain guard and the DB CHECK', async () => {
    const chapterId = await firstChapterId();
    await expect(
      repos.progress.setChapterProgress(academicYearId, chapterId, { testScore: 150 }),
    ).rejects.toBeInstanceOf(ChapterProgressError);

    await expect(
      db.insert(chapterProgress).values({
        academicYearId,
        chapterId: await repos.curriculum
          .getHierarchy(curriculumVersionId)
          .then((t) => t[1]!.units[0]!.chapters[0]!.id),
        recallScore: -3,
      }),
    ).rejects.toThrow();
  });

  it('lets a chapter state move backward when evidence changes', async () => {
    const chapterId = await firstChapterId();
    await repos.progress.setChapterProgress(academicYearId, chapterId, { state: 'REVISED' });
    const back = await repos.progress.setChapterProgress(academicYearId, chapterId, {
      state: 'LEARNING',
    });
    expect(back.state).toBe('LEARNING');
  });

  it('keeps two academic years independent for the same curriculum chapter', async () => {
    const chapterId = await firstChapterId();

    // a second student / academic year on the same published curriculum version
    const family = await repos.planning.createFamily({ name: 'F2' });
    const student = await repos.planning.createStudent({
      familyId: family.id,
      displayName: 'Second Student',
      board: 'CBSE',
      grade: 12,
    });
    const year2 = await repos.planning.createAcademicYear({
      studentId: student.id,
      yearLabel: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      curriculumVersionId,
    });

    await repos.progress.setChapterProgress(academicYearId, chapterId, { conceptScore: 10 });
    await repos.progress.setChapterProgress(year2.id, chapterId, { conceptScore: 90 });

    expect((await repos.progress.getChapterProgress(academicYearId, chapterId))?.conceptScore).toBe(10);
    expect((await repos.progress.getChapterProgress(year2.id, chapterId))?.conceptScore).toBe(90);
  });

  it('never mutates the curriculum chapter row', async () => {
    const chapterId = await firstChapterId();
    const before = (await db.select().from(chapters).where(eq(chapters.id, chapterId)))[0];
    await repos.progress.setChapterProgress(academicYearId, chapterId, {
      state: 'PRACTISED',
      conceptScore: 77,
    });
    const after = (await db.select().from(chapters).where(eq(chapters.id, chapterId)))[0];
    expect(after).toEqual(before);
  });

  it('cascades when the academic year is deleted', async () => {
    await db.delete(academicYears).where(eq(academicYears.id, academicYearId));
    expect(await db.select().from(chapterProgress)).toHaveLength(0);
  });
});

describe('getCurriculumProgress service', () => {
  it('merges the hierarchy with progress, defaulting unrecorded chapters', async () => {
    const result = await getCurriculumProgress(repos, academicYearId);
    expect(result?.subjects.map((s) => s.name)).toEqual([
      'Physics',
      'Chemistry',
      'Mathematics',
      'Computer Science',
    ]);
    const electrostatics = result!.subjects[0]!.units[0]!.chapters.find((c) => c.key === 'PHY01')!;
    expect(electrostatics.progress.schoolStatus).toBe('COMPLETED');
    expect(electrostatics.progress.conceptScore).toBe(45);
  });

  it('returns null for an unknown academic year', async () => {
    expect(
      await getCurriculumProgress(repos, '00000000-0000-0000-0000-000000000000'),
    ).toBeNull();
  });
});
