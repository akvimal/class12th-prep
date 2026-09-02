import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { recordStudySession } from '@/app-services/session';
import { StudySessionError } from '@/domain/progress/study-session';
import { academicYears, chapterProgress, studySessions } from '@/persistence/schema';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleProgressRepository } from './progress-repository';
import { createDrizzleSessionRepository } from './session-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let academicYearId: string;
let versionId: string;
let repos: {
  session: ReturnType<typeof createDrizzleSessionRepository>;
  planning: ReturnType<typeof createDrizzlePlanningRepository>;
  curriculum: ReturnType<typeof createDrizzleCurriculumRepository>;
  progress: ReturnType<typeof createDrizzleProgressRepository>;
};

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  const seed = await seedTestDatabase(db);
  academicYearId = seed.academicYearId!;
  versionId = seed.curriculumVersionId;
  repos = {
    session: createDrizzleSessionRepository(db),
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
    progress: createDrizzleProgressRepository(db),
  };
});

async function chapterIds() {
  const tree = await repos.curriculum.getHierarchy(versionId);
  return {
    phy01: tree[0]!.units[0]!.chapters.find((c) => c.key === 'PHY01')!.id,
    physicsSubject: tree[0]!.id,
  };
}

describe('study sessions', () => {
  it('the synthetic seed loaded four historical sessions, newest first', async () => {
    const sessions = await repos.session.listSessions(academicYearId);
    expect(sessions).toHaveLength(4);
    expect(sessions[0]!.sessionDate).toBe('2026-09-01');
    expect(sessions.at(-1)!.sessionDate).toBe('2026-08-28');
  });

  it('records completed, partial and not-done sessions', async () => {
    for (const completion of ['YES', 'PARTIAL', 'NO'] as const) {
      const s = await repos.session.recordSession({
        academicYearId,
        type: 'LEARN',
        completion,
        sessionDate: '2026-09-05',
        actualMinutes: completion === 'NO' ? 0 : 30,
      });
      expect(s.completion).toBe(completion);
    }
    expect(await repos.session.listSessions(academicYearId)).toHaveLength(7);
  });

  it('rejects negative minutes and correct > attempted at the domain guard and DB CHECK', async () => {
    await expect(
      repos.session.recordSession({
        academicYearId,
        type: 'PRACTISE',
        completion: 'YES',
        sessionDate: '2026-09-05',
        actualMinutes: -10,
      }),
    ).rejects.toBeInstanceOf(StudySessionError);

    await expect(
      repos.session.recordSession({
        academicYearId,
        type: 'PRACTISE',
        completion: 'YES',
        sessionDate: '2026-09-05',
        actualMinutes: 20,
        attempted: 5,
        correct: 9,
      }),
    ).rejects.toBeInstanceOf(StudySessionError);

    await expect(
      db.insert(studySessions).values({
        academicYearId,
        type: 'PRACTISE',
        completion: 'YES',
        sessionDate: '2026-09-05',
        actualMinutes: -1,
      }),
    ).rejects.toThrow();
  });

  it('the DB rejects a chapter session with no subject', async () => {
    const { phy01 } = await chapterIds();
    await expect(
      db.insert(studySessions).values({
        academicYearId,
        chapterId: phy01,
        type: 'LEARN',
        completion: 'YES',
        sessionDate: '2026-09-05',
        actualMinutes: 20,
      }),
    ).rejects.toThrow();
  });

  it('filters history by date range, subject, chapter and type', async () => {
    const { phy01, physicsSubject } = await chapterIds();
    await recordStudySession(repos, academicYearId, {
      type: 'REVISION',
      completion: 'YES',
      chapterId: phy01,
      sessionDate: '2026-10-01',
      actualMinutes: 25,
    });

    expect(
      await repos.session.listSessions(academicYearId, { from: '2026-09-30', to: '2026-10-31' }),
    ).toHaveLength(1);
    expect(
      (await repos.session.listSessions(academicYearId, { chapterId: phy01 })).length,
    ).toBeGreaterThanOrEqual(3); // 2 seeded + 1 just recorded
    expect(await repos.session.listSessions(academicYearId, { type: 'REVISION' })).toHaveLength(1);
    expect(
      (await repos.session.listSessions(academicYearId, { subjectId: physicsSubject })).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('recording a session does not touch chapter progress', async () => {
    const { phy01 } = await chapterIds();
    const before = (
      await db.select().from(chapterProgress).where(eq(chapterProgress.chapterId, phy01))
    )[0];

    await recordStudySession(repos, academicYearId, {
      type: 'PRACTISE',
      completion: 'PARTIAL',
      chapterId: phy01,
      sessionDate: '2026-09-06',
      actualMinutes: 30,
    });

    const after = (
      await db.select().from(chapterProgress).where(eq(chapterProgress.chapterId, phy01))
    )[0];
    expect(after).toEqual(before);
  });

  it('cascades when the academic year is deleted', async () => {
    await db.delete(academicYears).where(eq(academicYears.id, academicYearId));
    expect(await db.select().from(studySessions)).toHaveLength(0);
  });
});
