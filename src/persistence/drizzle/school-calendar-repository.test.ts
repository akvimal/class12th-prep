import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getCapacityRange, getDailyCapacity } from '@/app-services/calendar';
import { academicYears, schoolCalendarEvents } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleSchoolCalendarRepository } from './school-calendar-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let planning: ReturnType<typeof createDrizzlePlanningRepository>;
let calendar: ReturnType<typeof createDrizzleSchoolCalendarRepository>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  planning = createDrizzlePlanningRepository(db);
  calendar = createDrizzleSchoolCalendarRepository(db);
});

const shortPlan = {
  startDate: '2026-09-02',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-31',
  revisionStartDate: '2027-01-01',
  examWindowStart: '2027-02-01',
  examWindowEnd: '2027-03-31',
  weekdayCapacityMinutes: 120,
  weekendCapacityMinutes: 240,
};

async function seed() {
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
  const plan = await planning.createPlan({ academicYearId: year.id, ...shortPlan });
  return { year, plan };
}

const repos = () => ({ planning, schoolCalendar: calendar });

describe('school calendar CRUD', () => {
  it('creates, lists (with range filter), updates and deletes events', async () => {
    const { year } = await seed();

    await calendar.addEvent({
      academicYearId: year.id,
      type: 'HOLIDAY',
      title: 'Diwali',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
    });
    const { id: leaveId } = await calendar.addEvent({
      academicYearId: year.id,
      type: 'STUDY_LEAVE',
      startDate: '2027-01-15',
      endDate: '2027-01-31',
    });

    expect(await calendar.listEvents(year.id)).toHaveLength(2);
    expect(await calendar.listEvents(year.id, { from: '2026-11-01', to: '2026-11-30' })).toHaveLength(1);

    const updated = await calendar.updateEvent(leaveId, { capacityOverride: 300 });
    expect(updated.capacityOverride).toBe(300);

    await calendar.deleteEvent(leaveId);
    expect(await calendar.listEvents(year.id)).toHaveLength(1);
    await expect(calendar.deleteEvent(leaveId)).rejects.toThrow();
  });

  it('cascades when the academic year is deleted', async () => {
    const { year } = await seed();
    await calendar.addEvent({
      academicYearId: year.id,
      type: 'VACATION',
      startDate: '2026-12-24',
      endDate: '2027-01-01',
    });
    await db.delete(academicYears).where(eq(academicYears.id, year.id));
    expect(await db.select().from(schoolCalendarEvents)).toHaveLength(0);
  });

  it('rejects an out-of-order or negative-override event', async () => {
    const { year } = await seed();
    await expect(
      db.insert(schoolCalendarEvents).values({
        academicYearId: year.id,
        type: 'HOLIDAY',
        startDate: '2026-11-10',
        endDate: '2026-11-01',
      }),
    ).rejects.toThrow();
    await expect(
      db.insert(schoolCalendarEvents).values({
        academicYearId: year.id,
        type: 'HOLIDAY',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        capacityOverride: -5,
      }),
    ).rejects.toThrow();
  });
});

describe('capacity via the service', () => {
  it('returns weekday / weekend / event-driven minutes for specific dates', async () => {
    const { year, plan } = await seed();
    await calendar.addEvent({
      academicYearId: year.id,
      type: 'UNAVAILABLE',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
    });
    await calendar.addEvent({
      academicYearId: year.id,
      type: 'EXAM_DAY',
      startDate: '2026-09-11',
      endDate: '2026-09-11',
    });

    expect((await getDailyCapacity(repos(), plan.id, '2026-09-02'))?.minutes).toBe(120); // Wed
    expect((await getDailyCapacity(repos(), plan.id, '2026-09-05'))?.minutes).toBe(240); // Sat
    expect(await getDailyCapacity(repos(), plan.id, '2026-09-10')).toMatchObject({
      minutes: 0,
      basis: 'UNAVAILABLE',
    });
    expect((await getDailyCapacity(repos(), plan.id, '2026-09-11'))?.minutes).toBe(45);
  });

  it('sums a deterministic total over an arbitrary window', async () => {
    const { year, plan } = await seed();
    await calendar.addEvent({
      academicYearId: year.id,
      type: 'VACATION',
      startDate: '2026-12-24',
      endDate: '2026-12-31',
    });

    const range = await getCapacityRange(repos(), plan.id, '2026-12-24', '2026-12-30');
    expect(range?.days).toHaveLength(7);
    expect(range?.totalMinutes).toBe(7 * 240); // all vacation days at weekend capacity
  });

  it('defaults the range to the plan window', async () => {
    const { plan } = await seed();
    const range = await getCapacityRange(repos(), plan.id);
    expect(range?.from).toBe(shortPlan.startDate);
    expect(range?.to).toBe(shortPlan.examWindowEnd);
    expect(range && range.days.length > 100).toBe(true);
  });

  it('returns null for an unknown plan', async () => {
    expect(
      await getDailyCapacity(repos(), '00000000-0000-0000-0000-000000000000', '2026-09-02'),
    ).toBeNull();
  });
});
