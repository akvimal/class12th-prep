import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { chapterIdForKey } from './progress';
import {
  ensureRevisionScheduled,
  getRevisionQueue,
  recordRevisionOutcome,
  revisionStateForChapter,
} from './revision';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  const academicYearId = seed.academicYearId!;
  // The seed schedules a first revision for every learned chapter; these tests
  // drive the schedule explicitly, so start clean.
  for (const s of await repos.revision.listSchedules(academicYearId, {})) {
    await repos.revision.setStatus(s.id, 'CANCELLED');
  }
  return { repos, academicYearId };
}

describe('ensureRevisionScheduled', () => {
  it('schedules revision 1 for a revisable chapter, once', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;

    const first = await ensureRevisionScheduled(
      repos,
      academicYearId,
      chapterId,
      '2026-09-02',
      'LEARNED',
    );
    expect(first?.revisionNumber).toBe(1);
    expect(first?.dueDate).toBe('2026-09-03');

    const again = await ensureRevisionScheduled(
      repos,
      academicYearId,
      chapterId,
      '2026-09-05',
      'TESTED',
    );
    expect(again).toBeNull();
  });

  it('does nothing for a not-yet-learned chapter', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY02'))!;
    expect(
      await ensureRevisionScheduled(repos, academicYearId, chapterId, '2026-09-02', 'LEARNING'),
    ).toBeNull();
  });
});

describe('recordRevisionOutcome', () => {
  it('closes the active schedule and appends the next per the engine', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
    await ensureRevisionScheduled(repos, academicYearId, chapterId, '2026-09-02', 'LEARNED');

    const next = await recordRevisionOutcome(
      repos,
      academicYearId,
      chapterId,
      'MODERATE',
      '2026-09-03',
    );
    expect(next.revisionNumber).toBe(2);
    expect(next.dueDate).toBe('2026-09-06'); // +3 days

    const done = await repos.revision.listSchedules(academicYearId, { status: 'DONE', chapterId });
    expect(done).toHaveLength(1);
    expect(done[0]!.outcome).toBe('MODERATE');

    // exactly one active row remains
    expect(
      await repos.revision.listSchedules(academicYearId, { status: 'SCHEDULED', chapterId }),
    ).toHaveLength(1);
  });

  it('a WEAK outcome shortens the next gap', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'MAT01'))!;
    await ensureRevisionScheduled(repos, academicYearId, chapterId, '2026-09-02', 'LEARNED');
    await recordRevisionOutcome(repos, academicYearId, chapterId, 'MODERATE', '2026-09-03'); // → R2, due 09-06

    const weak = await recordRevisionOutcome(
      repos,
      academicYearId,
      chapterId,
      'WEAK',
      '2026-09-06',
    );
    // base for R3 is 7 days, WEAK ×0.5 → 4 (rounded)
    expect(weak.dueDate).toBe('2026-09-10');
    expect(weak.method).toBe('PRACTISE');
  });

  it('schedules from scratch when nothing was active', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'CS01'))!;
    const r = await recordRevisionOutcome(
      repos,
      academicYearId,
      chapterId,
      'MODERATE',
      '2026-09-02',
    );
    expect(r.revisionNumber).toBe(1);
  });
});

describe('revisionStateForChapter', () => {
  it('reports NONE / DUE_TODAY / OVERDUE from the active schedule', async () => {
    const { repos, academicYearId } = await seeded();
    const chapterId = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
    expect(await revisionStateForChapter(repos, academicYearId, chapterId, '2026-09-02')).toBe(
      'NONE',
    );

    await ensureRevisionScheduled(repos, academicYearId, chapterId, '2026-09-02', 'LEARNED'); // due 09-03
    expect(await revisionStateForChapter(repos, academicYearId, chapterId, '2026-09-03')).toBe(
      'DUE_TODAY',
    );
    expect(await revisionStateForChapter(repos, academicYearId, chapterId, '2026-09-05')).toBe(
      'OVERDUE',
    );
  });
});

describe('getRevisionQueue', () => {
  it('groups by overdue / due today / upcoming with chapter names', async () => {
    const { repos, academicYearId } = await seeded();
    const phy = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
    const che = (await chapterIdForKey(repos, academicYearId, 'CHE01'))!;
    await ensureRevisionScheduled(repos, academicYearId, phy, '2026-08-25', 'LEARNED'); // due 08-26 → overdue
    await ensureRevisionScheduled(repos, academicYearId, che, '2026-09-01', 'LEARNED'); // due 09-02 → today

    const q = await getRevisionQueue(repos, academicYearId, '2026-09-02');
    expect(q!.overdue.map((i) => i.chapterName)).toContain('Electrostatics');
    expect(q!.dueToday.map((i) => i.chapterName)).toContain('Solutions');
  });
});
