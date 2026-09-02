import { describe, expect, it } from 'vitest';
import { recalibrationV1 } from '@/config/recalibration';
import type { ReadinessComponents } from '@/domain/readiness/readiness';
import { recalibrateFromResult, type RecalibrationInput } from './recalibration';

const components = (over: Partial<ReadinessComponents> = {}): ReadinessComponents => ({
  conceptScore: 60,
  practiceScore: 60,
  testScore: 60,
  recallScore: 60,
  revisionScore: 60,
  ...over,
});

describe('recalibrateFromResult', () => {
  it('nudges testScore toward the observed percentage, weighted by type', () => {
    const input: RecalibrationInput = {
      assessmentType: 'PREBOARD',
      score: 40,
      maxMarks: 100,
      chapters: [{ chapterId: 'c1', components: components(), marksLostByType: {} }],
    };
    const [r] = recalibrateFromResult(input, recalibrationV1);
    // observed test = 40; w(PREBOARD) = 0.6 → 60·0.4 + 40·0.6 = 48
    expect(r!.observed.test).toBe(40);
    expect(r!.evidenceWeight).toBe(0.6);
    expect(r!.components.testScore).toBe(48);
    expect(r!.components.conceptScore).toBeUndefined();
    expect(r!.components.recallScore).toBeUndefined();
  });

  it('a class test moves the needle far less than a pre-board', () => {
    const chapters = [{ chapterId: 'c1', components: components(), marksLostByType: {} }];
    const pre = recalibrateFromResult(
      { assessmentType: 'PREBOARD', score: 40, maxMarks: 100, chapters },
      recalibrationV1,
    )[0]!;
    const cls = recalibrateFromResult(
      { assessmentType: 'SCHOOL_CLASS_TEST', score: 40, maxMarks: 100, chapters },
      recalibrationV1,
    )[0]!;
    // both observed 40, but the class test stays closer to the old 60
    expect(cls.components.testScore!).toBeGreaterThan(pre.components.testScore!);
    expect(cls.components.testScore).toBe(55); // 60·0.75 + 40·0.25
  });

  it('a knowledge-gap error also drags conceptScore below the test observation', () => {
    const input: RecalibrationInput = {
      assessmentType: 'PREBOARD',
      score: 70,
      maxMarks: 100,
      chapters: [
        {
          chapterId: 'c1',
          components: components(),
          marksLostByType: { CONCEPT: 12, CALCULATION: 6 },
        },
      ],
    };
    const [r] = recalibrateFromResult(input, recalibrationV1);
    // testObs = 100·(0.70 − 1.0·18/100) = 52
    expect(r!.observed.test).toBe(52);
    // conceptObs = 52 − 1.5·100·12/100 = 34 (only the CONCEPT marks, not CALCULATION)
    expect(r!.observed.concept).toBe(34);
    expect(r!.components.conceptScore).toBe(Math.round(60 * 0.4 + 34 * 0.6)); // 44
    expect(r!.drivers).toContain('concept gap −12');
  });

  it('MEMORY errors route to recallScore, not conceptScore', () => {
    const [r] = recalibrateFromResult(
      {
        assessmentType: 'SCHOOL_UNIT_TEST',
        score: 60,
        maxMarks: 100,
        chapters: [{ chapterId: 'c1', components: components(), marksLostByType: { MEMORY: 10 } }],
      },
      recalibrationV1,
    );
    expect(r!.components.recallScore).toBeDefined();
    expect(r!.components.conceptScore).toBeUndefined();
    expect(r!.observed.recall).toBe(35); // 50 − 1.5·100·10/100
  });

  it('exam-technique-only errors leave concept and recall untouched', () => {
    const [r] = recalibrateFromResult(
      {
        assessmentType: 'PREBOARD',
        score: 80,
        maxMarks: 100,
        chapters: [
          {
            chapterId: 'c1',
            components: components(),
            marksLostByType: { CARELESS: 8, TIME_MANAGEMENT: 12 },
          },
        ],
      },
      recalibrationV1,
    );
    expect(r!.components.conceptScore).toBeUndefined();
    expect(r!.components.recallScore).toBeUndefined();
    expect(r!.components.testScore).toBeDefined();
  });

  it('returns nothing when the test has no marks', () => {
    expect(
      recalibrateFromResult(
        {
          assessmentType: 'SELF_TEST',
          score: 0,
          maxMarks: 0,
          chapters: [{ chapterId: 'c1', components: components(), marksLostByType: {} }],
        },
        recalibrationV1,
      ),
    ).toEqual([]);
  });

  it('is version-stamped', () => {
    const [r] = recalibrateFromResult(
      {
        assessmentType: 'PREBOARD',
        score: 50,
        maxMarks: 100,
        chapters: [{ chapterId: 'c1', components: components(), marksLostByType: {} }],
      },
      recalibrationV1,
    );
    expect(r!.algorithmVersion).toBe('recalibration-v1');
  });
});
