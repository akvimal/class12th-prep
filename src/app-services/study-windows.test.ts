import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { StudyWindowError } from '@/domain/planning/study-window';
import { seedSynthetic } from './seed';
import {
  addStudyWindow,
  getWeeklyRhythm,
  listStudyWindows,
  removeStudyWindow,
  updateStudyWindow,
} from './study-windows';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

describe('study window CRUD', () => {
  it('the seed created the three default windows', async () => {
    const { repos, academicYearId } = await seeded();
    const windows = await listStudyWindows(repos, academicYearId);
    expect(windows.map((w) => w.label)).toEqual(['Deep work', 'After school', 'Recall block']);
  });

  it('creates, toggles and removes a window', async () => {
    const { repos, academicYearId } = await seeded();
    const w = await addStudyWindow(repos, {
      academicYearId,
      dayType: 'DAILY',
      startTime: '06:30',
      endTime: '07:15',
      label: 'Morning',
    });
    expect(w.enabled).toBe(true);

    const off = await updateStudyWindow(repos, w.id, { enabled: false });
    expect(off.enabled).toBe(false);

    await removeStudyWindow(repos, w.id);
    expect((await listStudyWindows(repos, academicYearId)).some((x) => x.id === w.id)).toBe(false);
  });

  it('rejects an inverted time range', async () => {
    const { repos, academicYearId } = await seeded();
    await expect(
      addStudyWindow(repos, {
        academicYearId,
        dayType: 'WEEKDAY',
        startTime: '19:00',
        endTime: '18:00',
      }),
    ).rejects.toBeInstanceOf(StudyWindowError);
  });
});

describe('getWeeklyRhythm', () => {
  it('scores planned vs done per day and computes adherence', async () => {
    const { repos, academicYearId } = await seeded();
    // The synthetic seed has study sessions on 2026-08-28..09-01.
    const rhythm = await getWeeklyRhythm(repos, academicYearId, '2026-09-02');
    expect(rhythm).not.toBeNull();
    expect(rhythm!.days).toHaveLength(7);
    expect(rhythm!.days[6]!.date).toBe('2026-09-02');

    // 2026-09-01 is a Tuesday — two weekday windows (90 + 45 = 135 planned).
    const tue = rhythm!.days.find((d) => d.date === '2026-09-01')!;
    expect(tue.plannedMinutes).toBe(135);
    expect(tue.doneMinutes).toBe(80); // PRACTISE 35 + LEARN 45 from the seed
    expect(tue.status).toBe('SHORT');

    // A day with a window but no session is MISSED; a non-window day is NONE_PLANNED.
    expect(rhythm!.days.some((d) => d.status === 'MISSED')).toBe(true);
    expect(rhythm!.adherenceRate).toBeGreaterThanOrEqual(0);
    expect(rhythm!.adherenceRate).toBeLessThanOrEqual(1);
  });

  it('returns null for an unknown academic year', async () => {
    const { repos } = await seeded();
    expect(
      await getWeeklyRhythm(repos, '00000000-0000-0000-0000-000000000000', '2026-09-02'),
    ).toBeNull();
  });
});
