import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { detectDailyEvents, emitEvent, listEvents } from './events';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId!, studentId: seed.studentId! };
}

describe('emitEvent', () => {
  it('is idempotent per student + dedupe key', async () => {
    const { repos, studentId } = await seeded();
    const draft = {
      studentId,
      eventType: 'SCHOOL_TEST_APPROACHING' as const,
      aggregateType: 'assessment',
      aggregateId: 'a1',
      on: '2026-09-02',
    };
    expect((await emitEvent(repos, draft)).created).toBe(true);
    expect((await emitEvent(repos, draft)).created).toBe(false);
    expect(await repos.events.list(studentId)).toHaveLength(1);
  });
});

describe('detectDailyEvents', () => {
  it('raises SCHOOL_TEST_APPROACHING for an imminent school test, once', async () => {
    const { repos, academicYearId } = await seeded();
    await addAssessment(repos, academicYearId, {
      type: 'SCHOOL_UNIT_TEST',
      name: 'Physics test',
      examDate: '2026-09-06',
      subjectKey: 'PHY',
      chapterKeys: ['PHY01'],
    });

    const first = await detectDailyEvents(repos, academicYearId, '2026-09-02');
    expect(first!.createdTypes).toContain('SCHOOL_TEST_APPROACHING');

    const again = await detectDailyEvents(repos, academicYearId, '2026-09-02');
    expect(again!.generated).toBe(0);

    const events = await listEvents(repos, academicYearId, {
      eventType: 'SCHOOL_TEST_APPROACHING',
    });
    expect(events!.length).toBeGreaterThanOrEqual(1);
    expect(events!.map((e) => e.payload.daysUntil)).toContain(4);
    const countBefore = events!.length;
    await detectDailyEvents(repos, academicYearId, '2026-09-02');
    expect(
      (await listEvents(repos, academicYearId, { eventType: 'SCHOOL_TEST_APPROACHING' }))!.length,
    ).toBe(countBefore);
  });

  it('raises REVISION_DUE for a learned-but-never-revised chapter', async () => {
    const { repos, academicYearId } = await seeded();
    // Seed chapter MAT01 is COMPLETED / readiness 82 with no revision recorded.
    const result = await detectDailyEvents(repos, academicYearId, '2026-09-02');
    const revision = await listEvents(repos, academicYearId, { eventType: 'REVISION_DUE' });
    expect(result!.createdTypes).toContain('REVISION_DUE');
    expect(revision!.length).toBeGreaterThan(0);
  });

  it('raises STUDY_BLOCK_MISSED when yesterday had a window and no session', async () => {
    const { repos, academicYearId } = await seeded();
    // 2026-09-03 is a Thursday with weekday windows; no session recorded that day.
    const result = await detectDailyEvents(repos, academicYearId, '2026-09-04');
    expect(result!.createdTypes).toContain('STUDY_BLOCK_MISSED');
    const missed = await listEvents(repos, academicYearId, { eventType: 'STUDY_BLOCK_MISSED' });
    expect(missed![0]!.payload.date).toBe('2026-09-03');
  });

  it('returns null for an unknown academic year', async () => {
    const { repos } = await seeded();
    expect(
      await detectDailyEvents(repos, '00000000-0000-0000-0000-000000000000', '2026-09-02'),
    ).toBeNull();
  });
});
