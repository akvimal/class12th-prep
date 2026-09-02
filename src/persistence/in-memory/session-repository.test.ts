import { describe, expect, it } from 'vitest';
import { listStudySessions, recordStudySession } from '@/app-services/session';
import { StudySessionError } from '@/domain/progress/study-session';
import { seedSynthetic } from '@/app-services/seed';
import { createInMemoryRepositories } from '@/persistence/in-memory';

describe('in-memory study sessions', () => {
  it('mirrors the drizzle repo: seed history, record, filter, validation', async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);
    const yearId = seed.academicYearId!;

    expect((await listStudySessions(repos, yearId))!).toHaveLength(4);

    const recorded = await recordStudySession(repos, yearId, {
      type: 'REVISION',
      completion: 'YES',
      chapterKey: 'PHY01',
      sessionDate: '2026-10-05',
      actualMinutes: 25,
      confidenceAfter: 'STRONG',
    });
    expect(recorded?.subjectId).not.toBeNull(); // resolved from the chapter

    const phy01History = await listStudySessions(repos, yearId, {
      chapterId: recorded!.chapterId!,
    });
    expect(phy01History!.length).toBeGreaterThanOrEqual(3);
    expect(phy01History![0]!.sessionDate).toBe('2026-10-05'); // newest first

    await expect(
      recordStudySession(repos, yearId, {
        type: 'PRACTISE',
        completion: 'YES',
        sessionDate: '2026-10-06',
        actualMinutes: 10,
        attempted: 3,
        correct: 7,
      }),
    ).rejects.toBeInstanceOf(StudySessionError);
  });

  it('returns null for an unknown academic year', async () => {
    const repos = createInMemoryRepositories();
    expect(await listStudySessions(repos, 'missing')).toBeNull();
    expect(
      await recordStudySession(repos, 'missing', {
        type: 'LEARN',
        completion: 'YES',
        actualMinutes: 20,
      }),
    ).toBeNull();
  });
});
