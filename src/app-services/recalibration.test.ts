import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { chapterIdForKey } from './progress';
import { calculateChapterReadiness } from './readiness';
import { buildDailyCandidates } from './candidates';
import { recordAssessmentResult } from './assessment-results';

const ON = '2026-09-07';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  const academicYearId = seed.academicYearId!;
  const phy01 = (await chapterIdForKey(repos, academicYearId, 'PHY01'))!;
  return { repos, academicYearId, phy01 };
}

async function readinessOf(
  repos: Awaited<ReturnType<typeof seeded>>['repos'],
  academicYearId: string,
  chapterId: string,
) {
  const r = await calculateChapterReadiness(repos, academicYearId, chapterId, {
    asOf: ON,
    persist: false,
  });
  return r!.result.effective;
}

describe('assessment recalibration (scenario 11)', () => {
  it('a weak pre-board on a chapter drops its readiness and lifts its priority', async () => {
    const { repos, academicYearId, phy01 } = await seeded();

    const before = await readinessOf(repos, academicYearId, phy01);
    const beforeProgress = (await repos.progress.getChapterProgress(academicYearId, phy01))!;
    const beforeCandidate = (await buildDailyCandidates(repos, academicYearId, ON)).find(
      (c) => c.chapterKey === 'PHY01',
    )!;

    const assessment = await addAssessment(repos, academicYearId, {
      type: 'PREBOARD',
      name: 'Pre-board 1 — Physics',
      examDate: ON,
      maxMarks: 70,
      subjectKey: 'PHY',
      chapterKeys: ['PHY01'],
    });
    await recordAssessmentResult(repos, academicYearId, assessment!.id, {
      score: 28, // 40%
      errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 18 }],
    });

    const progress = (await repos.progress.getChapterProgress(academicYearId, phy01))!;
    expect(progress.testScore).toBeLessThan(beforeProgress.testScore);
    expect(progress.conceptScore).toBeLessThan(beforeProgress.conceptScore);

    const after = await readinessOf(repos, academicYearId, phy01);
    expect(after).toBeLessThan(before - 5);

    const afterCandidate = (await buildDailyCandidates(repos, academicYearId, ON)).find(
      (c) => c.chapterKey === 'PHY01',
    )!;
    expect(afterCandidate.priority.effectiveReadiness).toBeLessThan(
      beforeCandidate.priority.effectiveReadiness,
    );
  });

  it('the same result as a class test moves readiness less than as a pre-board', async () => {
    async function drop(type: 'PREBOARD' | 'SCHOOL_CLASS_TEST') {
      const { repos, academicYearId, phy01 } = await seeded();
      const before = await readinessOf(repos, academicYearId, phy01);
      const a = await addAssessment(repos, academicYearId, {
        type,
        name: `${type} physics`,
        examDate: ON,
        maxMarks: 70,
        subjectKey: 'PHY',
        chapterKeys: ['PHY01'],
      });
      await recordAssessmentResult(repos, academicYearId, a!.id, {
        score: 28,
        errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 18 }],
      });
      return before - (await readinessOf(repos, academicYearId, phy01));
    }
    expect(await drop('PREBOARD')).toBeGreaterThan(await drop('SCHOOL_CLASS_TEST'));
  });

  it('evidence touches only the tested chapter', async () => {
    const { repos, academicYearId } = await seeded();
    const phy02 = (await chapterIdForKey(repos, academicYearId, 'PHY02'))!;
    const before = await repos.progress.getChapterProgress(academicYearId, phy02);

    const a = await addAssessment(repos, academicYearId, {
      type: 'PREBOARD',
      name: 'Pre-board — PHY01 only',
      examDate: ON,
      maxMarks: 70,
      subjectKey: 'PHY',
      chapterKeys: ['PHY01'],
    });
    await recordAssessmentResult(repos, academicYearId, a!.id, {
      score: 30,
      errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 15 }],
    });

    const after = await repos.progress.getChapterProgress(academicYearId, phy02);
    expect(after!.testScore).toBe(before!.testScore);
    expect(after!.conceptScore).toBe(before!.conceptScore);
  });
});
