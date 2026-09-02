import { describe, expect, it } from 'vitest';
import {
  assertPlanDateOrder,
  PlanDateOrderError,
  validatePlanDateOrder,
  type PlanDates,
} from './plan-dates';

// The current short plan from fixtures/synthetic-academic-data.json.
const validShort: PlanDates = {
  startDate: '2026-09-02',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-31',
  revisionStartDate: '2027-01-01',
  examWindowStart: '2027-02-01',
  examWindowEnd: '2027-03-31',
};

describe('validatePlanDateOrder', () => {
  it('accepts a correctly ordered plan', () => {
    expect(validatePlanDateOrder(validShort)).toEqual([]);
  });

  it('accepts a July–February plan (no month-specific logic)', () => {
    expect(
      validatePlanDateOrder({
        startDate: '2025-07-01',
        syllabusTargetDate: '2025-12-15',
        hardCompletionDate: '2026-01-05',
        revisionStartDate: '2026-01-06',
        examWindowStart: '2026-02-10',
        examWindowEnd: '2026-03-20',
      }),
    ).toEqual([]);
  });

  it('accepts a 90-day intensive plan', () => {
    expect(
      validatePlanDateOrder({
        startDate: '2026-11-01',
        syllabusTargetDate: '2026-12-20',
        hardCompletionDate: '2026-12-28',
        revisionStartDate: '2026-12-29',
        examWindowStart: '2027-01-25',
        examWindowEnd: '2027-01-30',
      }),
    ).toEqual([]);
  });

  it('accepts equal consecutive dates', () => {
    expect(validatePlanDateOrder({ ...validShort, hardCompletionDate: '2026-12-20' })).toEqual([]);
  });

  it('flags a syllabus target before the start date', () => {
    const violations = validatePlanDateOrder({ ...validShort, syllabusTargetDate: '2026-08-01' });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ field: 'syllabusTargetDate', after: 'startDate' });
  });

  it('flags an exam window that ends before it starts', () => {
    const violations = validatePlanDateOrder({ ...validShort, examWindowEnd: '2027-01-15' });
    expect(violations.map((v) => v.field)).toContain('examWindowEnd');
  });

  it('rejects non-ISO dates before checking order', () => {
    const violations = validatePlanDateOrder({ ...validShort, startDate: '02/09/2026' });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain('not an ISO date');
  });
});

describe('assertPlanDateOrder', () => {
  it('does not throw for a valid plan', () => {
    expect(() => assertPlanDateOrder(validShort)).not.toThrow();
  });

  it('throws PlanDateOrderError with violations attached', () => {
    try {
      assertPlanDateOrder({ ...validShort, revisionStartDate: '2026-06-01' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanDateOrderError);
      expect((err as PlanDateOrderError).violations.length).toBeGreaterThan(0);
    }
  });
});
