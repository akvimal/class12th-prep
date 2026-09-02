import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { recordAssessmentResult } from './assessment-results';
import { detectDailyEvents, listEvents } from './events';
import { getErrorPatterns } from './error-patterns';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

async function testWithError(
  repos: Awaited<ReturnType<typeof seeded>>['repos'],
  academicYearId: string,
  opts: {
    name: string;
    chapterKey: string;
    errorType: 'CALCULATION' | 'CONCEPT';
    marksLost: number;
  },
) {
  const a = await addAssessment(repos, academicYearId, {
    type: 'SCHOOL_UNIT_TEST',
    name: opts.name,
    examDate: '2026-09-07',
    maxMarks: 30,
    subjectKey: 'PHY',
    chapterKeys: [opts.chapterKey],
  });
  await recordAssessmentResult(repos, academicYearId, a!.id, {
    score: 30 - opts.marksLost,
    errors: [{ chapterKey: opts.chapterKey, errorType: opts.errorType, marksLost: opts.marksLost }],
  });
}

describe('getErrorPatterns', () => {
  it('surfaces an error type that recurs in one chapter', async () => {
    const { repos, academicYearId } = await seeded();
    await testWithError(repos, academicYearId, {
      name: 'Test 1',
      chapterKey: 'PHY01',
      errorType: 'CALCULATION',
      marksLost: 3,
    });
    expect(await getErrorPatterns(repos, academicYearId)).toEqual([]); // one occurrence

    await testWithError(repos, academicYearId, {
      name: 'Test 2',
      chapterKey: 'PHY01',
      errorType: 'CALCULATION',
      marksLost: 4,
    });

    const patterns = await getErrorPatterns(repos, academicYearId);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      scope: 'CHAPTER',
      errorType: 'CALCULATION',
      chapterName: 'Electrostatics',
      subjectName: 'Physics',
      occurrences: 2,
      marksLost: 7,
    });
  });

  it('detectDailyEvents raises REPEATED_ERROR_DETECTED once per pattern', async () => {
    const { repos, academicYearId } = await seeded();
    await testWithError(repos, academicYearId, {
      name: 'T1',
      chapterKey: 'PHY02',
      errorType: 'CONCEPT',
      marksLost: 5,
    });
    await testWithError(repos, academicYearId, {
      name: 'T2',
      chapterKey: 'PHY02',
      errorType: 'CONCEPT',
      marksLost: 6,
    });

    await detectDailyEvents(repos, academicYearId, '2026-09-08');
    await detectDailyEvents(repos, academicYearId, '2026-09-09'); // second run

    const events = (await listEvents(repos, academicYearId))!.filter(
      (e) => e.eventType === 'REPEATED_ERROR_DETECTED',
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.deliveryStatus).toBe('PENDING'); // channels off
    expect(events[0]!.payload).toMatchObject({ errorType: 'CONCEPT', knowledgeGap: true });
  });
});
