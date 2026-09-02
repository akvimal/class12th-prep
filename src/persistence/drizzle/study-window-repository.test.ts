import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { StudyWindowError } from '@/domain/planning/study-window';
import { families, studyWindows } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleStudyWindowRepository } from './study-window-repository';

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

async function academicYearId() {
  const planning = createDrizzlePlanningRepository(db);
  const [student] = await planning.listStudents();
  const [year] = await planning.listAcademicYears(student!.id);
  return year!.id;
}

describe('drizzle study window repository', () => {
  it('the seed created three windows, returned as HH:MM ordered by start', async () => {
    const repo = createDrizzleStudyWindowRepository(db);
    const windows = await repo.listWindows(await academicYearId());
    expect(windows.map((w) => w.startTime)).toEqual(['09:30', '17:00', '20:30']);
    expect(windows[0]!.endTime).toBe('13:00');
  });

  it('creates, updates and deletes', async () => {
    const repo = createDrizzleStudyWindowRepository(db);
    const ayId = await academicYearId();
    const w = await repo.createWindow({
      academicYearId: ayId,
      dayType: 'DAILY',
      startTime: '06:30',
      endTime: '07:15',
      label: 'Morning',
      reminderEnabled: false,
    });
    expect(w).toMatchObject({ dayType: 'DAILY', reminderEnabled: false, enabled: true });

    const upd = await repo.updateWindow(w.id, { endTime: '07:45', enabled: false });
    expect(upd.endTime).toBe('07:45');
    expect(upd.enabled).toBe(false);

    await repo.deleteWindow(w.id);
    expect((await repo.listWindows(ayId)).some((x) => x.id === w.id)).toBe(false);
  });

  it('the domain guard rejects an inverted range before the DB', async () => {
    const repo = createDrizzleStudyWindowRepository(db);
    await expect(
      repo.createWindow({
        academicYearId: await academicYearId(),
        dayType: 'WEEKDAY',
        startTime: '19:00',
        endTime: '18:00',
      }),
    ).rejects.toBeInstanceOf(StudyWindowError);
  });

  it('cascades away when the family is deleted', async () => {
    await db.delete(families);
    expect(await db.select().from(studyWindows)).toHaveLength(0);
  });
});
