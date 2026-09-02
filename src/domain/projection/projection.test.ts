import { describe, expect, it } from 'vitest';
import { projectionV1 } from '@/config/projection';
import { projectSubjectScore, type SubjectProjectionInput } from './projection';

function chapters(readinesses: (number | null)[]): SubjectProjectionInput['chapters'] {
  return readinesses.map((r, i) => ({
    chapterId: `c${i}`,
    boardWeight: 5,
    effectiveReadiness: r,
  }));
}

describe('projectSubjectScore', () => {
  it('withholds a projection until coverage and assessment bars are met', () => {
    const r = projectSubjectScore(
      {
        subjectKey: 'PHY',
        targetPct: 80,
        chapters: chapters([60, null, null, null]), // 25% covered
        assessments: [],
      },
      projectionV1,
    );
    expect(r.sufficientEvidence).toBe(false);
    expect(r.projectedPct).toBeNull();
    expect(r.marksOpportunityPct).toBeNull();
    expect(r.drivers[0]).toMatch(/readiness signal/);
  });

  it('projects once evidence is sufficient, and stays at or below the blended estimate', () => {
    const r = projectSubjectScore(
      {
        subjectKey: 'PHY',
        targetPct: 80,
        chapters: chapters([70, 60, 65, 55]), // 100% covered, weighted readiness 62.5
        assessments: [{ type: 'PREBOARD', scorePct: 58 }],
      },
      projectionV1,
    );
    expect(r.sufficientEvidence).toBe(true);
    expect(r.projectedPct).not.toBeNull();
    // blended = 0.7·62.5 + 0.3·58 = 61.15; conservative shrink ≤ 1 → projection ≤ blended
    expect(r.projectedPct!).toBeLessThanOrEqual(61.2);
    expect(r.weightedReadiness).toBe(62.5);
    expect(r.assessmentAverage).toBe(58);
  });

  it('marks opportunity is the positive gap to target, floored at zero', () => {
    const strong = projectSubjectScore(
      {
        subjectKey: 'CS',
        targetPct: 70,
        chapters: chapters([95, 92, 90, 94]),
        assessments: [{ type: 'PREBOARD', scorePct: 93 }],
      },
      projectionV1,
    );
    expect(strong.marksOpportunityPct).toBe(0); // projected well above a 70 target

    const weak = projectSubjectScore(
      {
        subjectKey: 'MAT',
        targetPct: 85,
        chapters: chapters([50, 45, 55, 40]),
        assessments: [{ type: 'PREBOARD', scorePct: 42 }],
      },
      projectionV1,
    );
    expect(weak.marksOpportunityPct!).toBeGreaterThan(0);
  });

  it('a pre-board carries more weight than a self test in the assessment average', () => {
    const base = {
      subjectKey: 'PHY',
      targetPct: 80,
      chapters: chapters([60, 60, 60, 60]),
    };
    const withPre = projectSubjectScore(
      {
        ...base,
        assessments: [
          { type: 'PREBOARD', scorePct: 40 },
          { type: 'SELF_TEST', scorePct: 90 },
        ],
      },
      projectionV1,
    );
    const withSelf = projectSubjectScore(
      {
        ...base,
        assessments: [
          { type: 'SELF_TEST', scorePct: 40 },
          { type: 'PREBOARD', scorePct: 90 },
        ],
      },
      projectionV1,
    );
    // the pre-board dominates: the first case skews low, the second high
    expect(withPre.assessmentAverage!).toBeLessThan(withSelf.assessmentAverage!);
  });

  it('is version-stamped and never exceeds the ceiling', () => {
    const r = projectSubjectScore(
      {
        subjectKey: 'CS',
        targetPct: 100,
        chapters: chapters([100, 100, 100, 100]),
        assessments: [
          { type: 'PREBOARD', scorePct: 100 },
          { type: 'FULL_MOCK', scorePct: 100 },
        ],
      },
      projectionV1,
    );
    expect(r.algorithmVersion).toBe('projection-v1');
    expect(r.projectedPct!).toBeLessThanOrEqual(projectionV1.projectionCeiling);
  });
});
