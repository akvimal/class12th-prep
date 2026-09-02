import { describe, expect, it } from 'vitest';
import { getCapacityRange, getDailyCapacity, listCalendarEvents } from '@/app-services/calendar';
import { createInMemoryRepositories } from '@/persistence/in-memory';

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
  const repos = createInMemoryRepositories();
  const family = await repos.planning.createFamily({ name: 'F' });
  const student = await repos.planning.createStudent({
    familyId: family.id,
    displayName: 'S',
    board: 'CBSE',
    grade: 12,
  });
  const year = await repos.planning.createAcademicYear({
    studentId: student.id,
    yearLabel: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  });
  const plan = await repos.planning.createPlan({ academicYearId: year.id, ...shortPlan });
  return { repos, year, plan };
}

describe('in-memory school calendar', () => {
  it('mirrors the drizzle repo: CRUD, range filter and capacity', async () => {
    const { repos, year, plan } = await seed();

    await repos.schoolCalendar.addEvent({
      academicYearId: year.id,
      type: 'UNAVAILABLE',
      startDate: '2026-09-10',
      endDate: '2026-09-10',
    });
    await repos.schoolCalendar.addEvent({
      academicYearId: year.id,
      type: 'HOLIDAY',
      startDate: '2026-11-08',
      endDate: '2026-11-08',
    });

    expect(
      await listCalendarEvents(repos, year.id, { from: '2026-11-01', to: '2026-11-30' }),
    ).toHaveLength(1);
    expect((await getDailyCapacity(repos, plan.id, '2026-09-02'))?.minutes).toBe(120);
    expect(await getDailyCapacity(repos, plan.id, '2026-09-10')).toMatchObject({ minutes: 0 });

    const range = await getCapacityRange(repos, plan.id, '2026-09-05', '2026-09-06');
    expect(range?.totalMinutes).toBe(480); // Sat + Sun
  });

  it('deletes events and rejects deleting a missing one', async () => {
    const { repos, year } = await seed();
    const { id } = await repos.schoolCalendar.addEvent({
      academicYearId: year.id,
      type: 'VACATION',
      startDate: '2026-12-24',
      endDate: '2027-01-01',
    });
    await repos.schoolCalendar.deleteEvent(id);
    await expect(repos.schoolCalendar.deleteEvent(id)).rejects.toThrow();
  });
});
