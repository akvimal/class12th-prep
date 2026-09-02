import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { logStudy } from './study-flow';
import { listEvents } from './events';
import { generateWeeklyReview, getLatestWeeklyReview } from './weekly-review';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

describe('generateWeeklyReview', () => {
  it('summarises the trailing week, persists it and announces once', async () => {
    const { repos, academicYearId } = await seeded();
    // two sessions inside the window ending 2026-09-10 (covers 2026-09-03..09)
    await logStudy(repos, academicYearId, {
      type: 'PRACTISE',
      completion: 'YES',
      chapterKey: 'PHY01',
      actualMinutes: 45,
      attempted: 10,
      correct: 8,
      sessionDate: '2026-09-04',
    });
    await logStudy(repos, academicYearId, {
      type: 'LEARN',
      completion: 'YES',
      chapterKey: 'PHY02',
      actualMinutes: 30,
      sessionDate: '2026-09-06',
    });

    const review = await generateWeeklyReview(repos, academicYearId, '2026-09-10');
    expect(review!.weekStart).toBe('2026-09-03');
    expect(review!.weekEnd).toBe('2026-09-09');
    expect(review!.sessionsLogged).toBe(2);
    expect(review!.minutesLogged).toBe(75);
    expect(review!.accuracyPct).toBe(80);

    // stored
    expect((await getLatestWeeklyReview(repos, academicYearId))?.weekStart).toBe('2026-09-03');

    // announced
    const events = await listEvents(repos, academicYearId);
    expect(events!.some((e) => e.eventType === 'WEEKLY_REVIEW_READY')).toBe(true);
  });

  it('is idempotent — regenerating overwrites the row and does not re-announce', async () => {
    const { repos, academicYearId } = await seeded();
    await generateWeeklyReview(repos, academicYearId, '2026-09-10');
    await generateWeeklyReview(repos, academicYearId, '2026-09-10');
    await generateWeeklyReview(repos, academicYearId, '2026-09-10', { announce: false });

    expect(await repos.weeklyReview.list(academicYearId)).toHaveLength(1);
    const events = await listEvents(repos, academicYearId);
    expect(events!.filter((e) => e.eventType === 'WEEKLY_REVIEW_READY')).toHaveLength(1);
  });

  it('returns null for an unknown academic year', async () => {
    const { repos } = await seeded();
    expect(
      await generateWeeklyReview(repos, '00000000-0000-0000-0000-000000000000', '2026-09-10'),
    ).toBeNull();
  });
});
