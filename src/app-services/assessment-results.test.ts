import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { AssessmentResultError } from '@/domain/errors/errors';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import {
  advanceQuestionError,
  getAssessmentResult,
  listQuestionErrors,
  recordAssessmentResult,
} from './assessment-results';

async function seededWithTest() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  const academicYearId = seed.academicYearId!;
  const assessment = await addAssessment(repos, academicYearId, {
    type: 'SCHOOL_UNIT_TEST',
    name: 'Physics unit test',
    examDate: '2026-09-07',
    maxMarks: 30,
    subjectKey: 'PHY',
    chapterKeys: ['PHY01', 'PHY02'],
  });
  return { repos, academicYearId, assessmentId: assessment!.id };
}

describe('recordAssessmentResult', () => {
  it('records the result + errors and marks the assessment COMPLETED', async () => {
    const { repos, academicYearId, assessmentId } = await seededWithTest();

    const result = await recordAssessmentResult(repos, academicYearId, assessmentId, {
      score: 22,
      timeTakenMinutes: 55,
      errors: [
        { chapterKey: 'PHY01', errorType: 'CALCULATION', marksLost: 3 },
        { chapterKey: 'PHY02', errorType: 'CONCEPT', marksLost: 5 },
      ],
    });

    expect(result?.score).toBe(22);
    expect(result?.errors).toHaveLength(2);
    expect(result?.errors.every((e) => e.state === 'NEW')).toBe(true);

    expect((await repos.assessment.getAssessment(assessmentId))?.status).toBe('COMPLETED');
    expect((await getAssessmentResult(repos, assessmentId))?.errors).toHaveLength(2);
  });

  it('rejects an error on a chapter the test did not cover', async () => {
    const { repos, academicYearId, assessmentId } = await seededWithTest();
    await expect(
      recordAssessmentResult(repos, academicYearId, assessmentId, {
        score: 25,
        errors: [{ chapterKey: 'MAT01', errorType: 'CONCEPT', marksLost: 2 }],
      }),
    ).rejects.toThrow(/MAT01/);
  });

  it('rejects tagged marks that exceed the marks dropped', async () => {
    const { repos, academicYearId, assessmentId } = await seededWithTest();
    await expect(
      recordAssessmentResult(repos, academicYearId, assessmentId, {
        score: 29, // dropped 1
        errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 5 }],
      }),
    ).rejects.toBeInstanceOf(AssessmentResultError);
  });

  it('returns null for an assessment in another academic year', async () => {
    const { repos, assessmentId } = await seededWithTest();
    expect(
      await recordAssessmentResult(repos, '00000000-0000-0000-0000-000000000000', assessmentId, {
        score: 20,
        errors: [],
      }),
    ).toBeNull();
  });
});

describe('question error lifecycle', () => {
  it('lists errors with names and advances them through the state machine', async () => {
    const { repos, academicYearId, assessmentId } = await seededWithTest();
    await recordAssessmentResult(repos, academicYearId, assessmentId, {
      score: 24,
      errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 6 }],
    });

    const [err] = await listQuestionErrors(repos, academicYearId);
    expect(err?.chapterName).toBe('Electrostatics');
    expect(err?.state).toBe('NEW');

    await advanceQuestionError(repos, err!.id, 'REVIEW');
    await advanceQuestionError(repos, err!.id, 'CORRECT');
    const retestDue = await advanceQuestionError(repos, err!.id, 'SCHEDULE_RETEST');
    expect(retestDue.state).toBe('RETEST_DUE');

    const mastered = await advanceQuestionError(repos, err!.id, 'PASS_RETEST');
    expect(mastered.state).toBe('MASTERED');

    expect(await listQuestionErrors(repos, academicYearId, { state: 'MASTERED' })).toHaveLength(1);
    expect(await listQuestionErrors(repos, academicYearId, { state: 'NEW' })).toHaveLength(0);
  });
});
