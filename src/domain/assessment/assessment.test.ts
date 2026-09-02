import { describe, expect, it } from 'vitest';
import {
  assertAssessmentDraft,
  AssessmentError,
  isSchoolAssessment,
  validateAssessmentDraft,
  type AssessmentDraft,
} from './assessment';

const ok: AssessmentDraft = {
  type: 'SCHOOL_UNIT_TEST',
  name: 'Physics unit test',
  examDate: '2026-09-20',
  maxMarks: 30,
  chapterKeys: ['PHY01'],
};

describe('validateAssessmentDraft', () => {
  it('accepts a well-formed draft', () => {
    expect(validateAssessmentDraft(ok)).toEqual([]);
  });

  it('requires a name, a valid date and at least one chapter', () => {
    const fields = validateAssessmentDraft({
      ...ok,
      name: '  ',
      examDate: '20-09-2026',
      chapterKeys: [],
    }).map((v) => v.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'examDate', 'chapterKeys']));
  });

  it('rejects a non-positive maxMarks but allows it to be omitted', () => {
    expect(validateAssessmentDraft({ ...ok, maxMarks: 0 }).map((v) => v.field)).toContain(
      'maxMarks',
    );
    expect(validateAssessmentDraft({ ...ok, maxMarks: null })).toEqual([]);
  });

  it('assert throws AssessmentError', () => {
    expect(() => assertAssessmentDraft({ ...ok, chapterKeys: [] })).toThrow(AssessmentError);
    expect(() => assertAssessmentDraft(ok)).not.toThrow();
  });
});

describe('isSchoolAssessment', () => {
  it('marks school-set tests, not self-practice', () => {
    expect(isSchoolAssessment('SCHOOL_UNIT_TEST')).toBe(true);
    expect(isSchoolAssessment('PREBOARD')).toBe(true);
    expect(isSchoolAssessment('SELF_TEST')).toBe(false);
    expect(isSchoolAssessment('PYQ')).toBe(false);
  });
});
