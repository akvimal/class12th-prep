import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { families, weeklyReviews } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { WeeklyReview } from '@/domain/review/weekly-review';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleWeeklyReviewRepository } from './weekly-review-repository';

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

async function academicYearId(): Promise<string> {
  const planning = createDrizzlePlanningRepository(db);
  const [student] = await planning.listStudents();
  const [year] = await planning.listAcademicYears(student!.id);
  return year!.id;
}

const summary = (over: Partial<WeeklyReview> = {}): WeeklyReview => ({
  weekStart: '2026-09-03',
  weekEnd: '2026-09-09',
  sessionsLogged: 4,
  minutesLogged: 180,
  fullCompletions: 3,
  plannedDays: 6,
  metDays: 4,
  adherenceRate: 0.67,
  accuracyPct: 72,
  timeByActivity: { LEARN: 80, PRACTISE: 100 },
  readinessMovement: [
    { subjectKey: 'PHY', subjectName: 'Physics', from: 40, to: 45, delta: 5 },
  ],
  revisionsDone: 2,
  errorsLogged: 1,
  focusNext: [],
  algorithmVersion: 'review-v1',
  ...over,
});

describe('drizzle weekly-review repository', () => {
  it('upserts by (academic year, week start) and overwrites on regeneration', async () => {
    const repo = createDrizzleWeeklyReviewRepository(db);
    const ay = await academicYearId();

    await repo.upsert(ay, '2026-09-03', '2026-09-09', summary());
    await repo.upsert(ay, '2026-09-03', '2026-09-09', summary({ sessionsLogged: 9 }));

    const all = await repo.list(ay);
    expect(all).toHaveLength(1);
    expect(all[0]!.summary.sessionsLogged).toBe(9);

    const one = await repo.get(ay, '2026-09-03');
    expect(one?.summary.algorithmVersion).toBe('review-v1');
  });

  it('lists newest week first', async () => {
    const repo = createDrizzleWeeklyReviewRepository(db);
    const ay = await academicYearId();
    await repo.upsert(ay, '2026-09-03', '2026-09-09', summary({ weekStart: '2026-09-03' }));
    await repo.upsert(ay, '2026-09-10', '2026-09-16', summary({ weekStart: '2026-09-10' }));

    const list = await repo.list(ay, { limit: 1 });
    expect(list).toHaveLength(1);
    expect(list[0]!.weekStart).toBe('2026-09-10');
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleWeeklyReviewRepository(db);
    await repo.upsert(await academicYearId(), '2026-09-03', '2026-09-09', summary());
    await db.delete(families);
    expect(await db.select().from(weeklyReviews)).toHaveLength(0);
  });
});
