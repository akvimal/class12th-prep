import { describe, expect, it } from 'vitest';
import {
  advanceErrorState,
  AssessmentResultError,
  assertAssessmentResult,
  canAdvanceError,
  ErrorTransitionError,
  isKnowledgeGap,
  validateAssessmentResult,
  type AssessmentResultDraft,
} from './errors';

describe('error state machine', () => {
  it('walks NEW → REVIEWED → CORRECTED → RETEST_DUE → MASTERED', () => {
    let s = advanceErrorState('NEW', 'REVIEW');
    expect(s).toBe('REVIEWED');
    s = advanceErrorState(s, 'CORRECT');
    expect(s).toBe('CORRECTED');
    s = advanceErrorState(s, 'SCHEDULE_RETEST');
    expect(s).toBe('RETEST_DUE');
    s = advanceErrorState(s, 'PASS_RETEST');
    expect(s).toBe('MASTERED');
  });

  it('a failed retest drops back to CORRECTED, not MASTERED', () => {
    expect(advanceErrorState('RETEST_DUE', 'FAIL_RETEST')).toBe('CORRECTED');
  });

  it('cannot skip to MASTERED without a passed retest', () => {
    expect(canAdvanceError('CORRECTED', 'PASS_RETEST')).toBe(false);
    expect(() => advanceErrorState('CORRECTED', 'PASS_RETEST')).toThrow(ErrorTransitionError);
    expect(() => advanceErrorState('NEW', 'CORRECT')).toThrow(ErrorTransitionError);
  });

  it('MASTERED is terminal', () => {
    for (const t of [
      'REVIEW',
      'CORRECT',
      'SCHEDULE_RETEST',
      'PASS_RETEST',
      'FAIL_RETEST',
    ] as const) {
      expect(canAdvanceError('MASTERED', t)).toBe(false);
    }
  });
});

describe('isKnowledgeGap', () => {
  it('separates knowledge gaps from exam-technique slips', () => {
    expect(isKnowledgeGap('CONCEPT')).toBe(true);
    expect(isKnowledgeGap('WRONG_METHOD')).toBe(true);
    expect(isKnowledgeGap('CARELESS')).toBe(false);
    expect(isKnowledgeGap('TIME_MANAGEMENT')).toBe(false);
  });
});

describe('validateAssessmentResult', () => {
  const ok: AssessmentResultDraft = {
    score: 22,
    maxMarks: 30,
    errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 5 }],
  };

  it('accepts a coherent result', () => {
    expect(validateAssessmentResult(ok)).toEqual([]);
  });

  it('rejects a score outside 0..maxMarks', () => {
    expect(validateAssessmentResult({ ...ok, score: 31 }).map((v) => v.field)).toContain('score');
    expect(validateAssessmentResult({ ...ok, score: -1 }).map((v) => v.field)).toContain('score');
  });

  it('rejects tagged marks lost exceeding the marks dropped', () => {
    const v = validateAssessmentResult({
      ...ok,
      score: 28, // dropped 2
      errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 5 }],
    });
    expect(v.map((x) => x.field)).toContain('errors');
  });

  it('rejects a non-positive marksLost', () => {
    expect(
      validateAssessmentResult({
        ...ok,
        errors: [{ chapterKey: 'PHY01', errorType: 'CONCEPT', marksLost: 0 }],
      }).map((v) => v.field),
    ).toContain('errors');
  });

  it('assert throws AssessmentResultError', () => {
    expect(() => assertAssessmentResult({ ...ok, score: 99 })).toThrow(AssessmentResultError);
    expect(() => assertAssessmentResult(ok)).not.toThrow();
  });
});
