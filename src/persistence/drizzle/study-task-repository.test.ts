import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { families, studySessions, studyTasks } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { NewStudyTask } from '@/persistence/ports';
import type { DrizzleDb } from './db';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleStudyTaskRepository } from './study-task-repository';

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
  const phy = hierarchy.find((s) => s.key === 'PHY')!;
  const chapters = phy.units.flatMap((u) => u.chapters);
  const task = (chapterKey: string, over: Partial<NewStudyTask> = {}): NewStudyTask => ({
    chapterId: chapters.find((c) => c.key === chapterKey)!.id,
    subjectId: phy.id,
    plannedDate: '2026-09-02',
    activity: 'LEARN',
    plannedMinutes: 40,
    slot: 'PRIMARY',
    reasonCodes: ['LOW_READINESS'],
    priorityScore: 0.8,
    algorithmVersion: 'planner-v1',
    ...over,
  });
  return { academicYearId: year!.id, task };
}

describe('drizzle study-task repository', () => {
  it('saveDailyPlan upserts, then cancels rows no longer proposed', async () => {
    const repo = createDrizzleStudyTaskRepository(db);
    const { academicYearId, task } = await context();

    await repo.saveDailyPlan(academicYearId, '2026-09-02', [task('PHY01'), task('PHY02')]);
    // re-run with one chapter dropped and the other's minutes changed
    await repo.saveDailyPlan(academicYearId, '2026-09-02', [
      task('PHY01', { plannedMinutes: 55 }),
    ]);

    const scheduled = await repo.listTasks(academicYearId, {
      plannedDate: '2026-09-02',
      status: 'SCHEDULED',
    });
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]!.plannedMinutes).toBe(55);

    const cancelled = await repo.listTasks(academicYearId, {
      plannedDate: '2026-09-02',
      status: 'CANCELLED',
    });
    expect(cancelled).toHaveLength(1);
  });

  it('the partial unique index blocks a second open row for the same chapter/day', async () => {
    const { academicYearId, task } = await context();
    const repo = createDrizzleStudyTaskRepository(db);
    await repo.saveDailyPlan(academicYearId, '2026-09-02', [task('PHY01')]);
    // a raw insert bypassing saveDailyPlan's upsert must be rejected
    await expect(
      db.insert(studyTasks).values({
        academicYearId,
        chapterId: task('PHY01').chapterId,
        subjectId: task('PHY01').subjectId,
        plannedDate: '2026-09-02',
        activity: 'PRACTISE',
        plannedMinutes: 20,
        slot: 'PRIMARY',
      }),
    ).rejects.toThrow();
  });

  it('resolve + missedCountByChapter', async () => {
    const repo = createDrizzleStudyTaskRepository(db);
    const { academicYearId, task } = await context();
    const [a, b] = await repo.saveDailyPlan(academicYearId, '2026-09-02', [
      task('PHY01'),
      task('PHY02'),
    ]);

    await repo.resolve(a!.id, 'MISSED', { resolvedAt: '2026-09-03' });
    await repo.resolve(b!.id, 'COMPLETED');

    const missed = await repo.missedCountByChapter(academicYearId);
    expect(missed[a!.chapterId]).toBe(1);
    expect(missed[b!.chapterId]).toBeUndefined();

    const resolved = await repo.listTasks(academicYearId, { status: 'MISSED' });
    expect(resolved[0]!.resolvedAt).not.toBeNull();
  });

  it('a session links to its task; deleting the task nulls the link, not the session', async () => {
    const repo = createDrizzleStudyTaskRepository(db);
    const { academicYearId, task } = await context();
    const [t] = await repo.saveDailyPlan(academicYearId, '2026-09-02', [task('PHY01')]);

    const [session] = await db
      .insert(studySessions)
      .values({
        academicYearId,
        chapterId: t!.chapterId,
        subjectId: t!.subjectId,
        studyTaskId: t!.id,
        type: 'LEARN',
        completion: 'YES',
        sessionDate: '2026-09-02',
        actualMinutes: 40,
      })
      .returning();
    expect(session!.studyTaskId).toBe(t!.id);

    await db.delete(studyTasks).where(eq(studyTasks.id, t!.id));
    const [after] = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, session!.id));
    expect(after).toBeDefined();
    expect(after!.studyTaskId).toBeNull();
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleStudyTaskRepository(db);
    const { academicYearId, task } = await context();
    await repo.saveDailyPlan(academicYearId, '2026-09-02', [task('PHY01')]);
    await db.delete(families);
    expect(await db.select().from(studyTasks)).toHaveLength(0);
  });
});
