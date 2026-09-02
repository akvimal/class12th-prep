import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { ChapterProgressError } from '@/domain/progress/chapter-progress';
import { seedSynthetic } from './seed';
import { chapterIdForKey, getCurriculumProgress } from './progress';
import { listStudySessions } from './session';
import { logStudy, updateChapterSelfAssessment } from './study-flow';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

async function progressFor(
  repos: Awaited<ReturnType<typeof seeded>>['repos'],
  academicYearId: string,
  chapterKey: string,
) {
  const tree = await getCurriculumProgress(repos, academicYearId);
  const chapter = tree!.subjects
    .flatMap((s) => s.units)
    .flatMap((u) => u.chapters)
    .find((c) => c.key === chapterKey);
  return chapter!.progress;
}

describe('logStudy', () => {
  it('records the session and stamps lastStudiedAt without touching scores or state', async () => {
    const { repos, academicYearId } = await seeded();
    const before = await progressFor(repos, academicYearId, 'PHY01');

    const result = await logStudy(repos, academicYearId, {
      chapterKey: 'PHY01',
      type: 'PRACTISE',
      completion: 'PARTIAL',
      actualMinutes: 30,
      attempted: 8,
      correct: 5,
      sessionDate: '2026-09-05',
    });

    expect(result?.chapterId).toBeTruthy();
    const sessions = await listStudySessions(repos, academicYearId, {
      chapterId: result!.chapterId!,
    });
    expect(sessions!.some((s) => s.sessionDate === '2026-09-05' && s.type === 'PRACTISE')).toBe(
      true,
    );

    const after = await progressFor(repos, academicYearId, 'PHY01');
    expect(after.lastStudiedAt?.slice(0, 10)).toBe('2026-09-05');
    // PRACTISE is not a revision — lastRevisedAt unchanged
    expect(after.lastRevisedAt).toBe(before.lastRevisedAt);
    expect(after.state).toBe(before.state);
    expect(after.conceptScore).toBe(before.conceptScore);
  });

  it('stamps lastRevisedAt for a retrieval/testing session', async () => {
    const { repos, academicYearId } = await seeded();
    await logStudy(repos, academicYearId, {
      chapterKey: 'PHY01',
      type: 'ACTIVE_RECALL',
      completion: 'YES',
      actualMinutes: 20,
      sessionDate: '2026-09-06',
    });
    const after = await progressFor(repos, academicYearId, 'PHY01');
    expect(after.lastRevisedAt?.slice(0, 10)).toBe('2026-09-06');
  });

  it('recomputes and snapshots the chapter readiness', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
    const before = await repos.readiness.listSnapshots(academicYearId, {
      scopeType: 'CHAPTER',
      scopeId: chapterId,
    });

    const result = await logStudy(repos, academicYearId, {
      chapterKey: 'PHY01',
      type: 'REVISION',
      completion: 'YES',
      actualMinutes: 25,
      sessionDate: '2026-09-07',
    });

    expect(result?.readiness).not.toBeNull();
    const after = await repos.readiness.listSnapshots(academicYearId, {
      scopeType: 'CHAPTER',
      scopeId: chapterId,
    });
    expect(after.length).toBe(before.length + 1);
  });

  it('handles a session with no chapter (subject-only) gracefully', async () => {
    const { repos, academicYearId } = await seeded();
    const result = await logStudy(repos, academicYearId, {
      subjectKey: 'PHY',
      type: 'SAMPLE_PAPER',
      completion: 'YES',
      actualMinutes: 90,
      sessionDate: '2026-09-08',
    });
    expect(result?.chapterId).toBeNull();
    expect(result?.readiness).toBeNull();
  });
});

describe('updateChapterSelfAssessment', () => {
  it('applies the patch and returns the recomputed readiness', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY03'))!;

    const readiness = await updateChapterSelfAssessment(
      repos,
      academicYearId,
      chapterId,
      { schoolStatus: 'COMPLETED', confidence: 'MODERATE', conceptScore: 70, practiceScore: 60 },
      '2026-09-05',
    );

    expect(readiness).not.toBeNull();
    const after = await progressFor(repos, academicYearId, 'PHY03');
    expect(after.schoolStatus).toBe('COMPLETED');
    expect(after.confidence).toBe('MODERATE');
    expect(after.conceptScore).toBe(70);
  });

  it('rejects an out-of-range component score', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY03'))!;
    await expect(
      updateChapterSelfAssessment(repos, academicYearId, chapterId, { testScore: 140 }),
    ).rejects.toBeInstanceOf(ChapterProgressError);
  });
});
