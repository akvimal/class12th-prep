import { describe, expect, it } from 'vitest';
import { ChapterProgressError } from '@/domain/progress/chapter-progress';
import { getCurriculumProgress } from '@/app-services/progress';
import { seedSynthetic } from '@/app-services/seed';
import { createInMemoryRepositories } from '@/persistence/in-memory';

describe('in-memory chapter progress', () => {
  it('mirrors the drizzle repo: seed, upsert, backward state, range validation', async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);
    const yearId = seed.academicYearId!;

    expect(await repos.progress.listChapterProgress(yearId)).toHaveLength(12);

    const tree = await repos.curriculum.getHierarchy(seed.curriculumVersionId);
    const chapterId = tree[0]!.units[0]!.chapters[0]!.id;

    await repos.progress.setChapterProgress(yearId, chapterId, {
      state: 'REVISED',
      conceptScore: 80,
    });
    const back = await repos.progress.setChapterProgress(yearId, chapterId, { state: 'LEARNING' });
    expect(back.state).toBe('LEARNING');
    expect(back.conceptScore).toBe(80); // unchanged by the second patch

    expect(
      (await repos.progress.listChapterProgress(yearId)).filter((p) => p.chapterId === chapterId),
    ).toHaveLength(1);

    await expect(
      repos.progress.setChapterProgress(yearId, chapterId, { recallScore: 120 }),
    ).rejects.toBeInstanceOf(ChapterProgressError);
  });

  it('getCurriculumProgress defaults chapters with no record', async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);

    // fresh year with the same curriculum but no progress
    const student = await repos.planning.createStudent({
      familyId: (await repos.planning.createFamily({ name: 'F' })).id,
      displayName: 'S',
      board: 'CBSE',
      grade: 12,
    });
    const year = await repos.planning.createAcademicYear({
      studentId: student.id,
      yearLabel: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      curriculumVersionId: seed.curriculumVersionId,
    });

    const result = await getCurriculumProgress(repos, year.id);
    const anyChapter = result!.subjects[0]!.units[0]!.chapters[0]!;
    expect(anyChapter.progress.state).toBe('NOT_STARTED');
    expect(anyChapter.progress.effectiveReadiness).toBeNull();
  });
});
