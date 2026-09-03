import { describe, expect, it } from 'vitest';
import { trajectoryRiskV1 } from '@/config/trajectory-risk';
import { assessTrajectoryRisk, type TrajectoryRiskInput } from './trajectory-risk';

const base: TrajectoryRiskInput = {
  planStart: '2026-09-01',
  syllabusTarget: '2026-12-20', // 110 days
  hardCompletion: '2026-12-31',
  asOf: '2026-11-01', // ~55% elapsed
  actualWeightedCompletion: 0.55,
};

describe('assessTrajectoryRisk', () => {
  it('is quiet when actual completion tracks the expected line', () => {
    expect(assessTrajectoryRisk(base, trajectoryRiskV1)).toEqual([]);
  });

  it('says nothing while it is still too early in the plan', () => {
    expect(
      assessTrajectoryRisk(
        { ...base, asOf: '2026-09-05', actualWeightedCompletion: 0 },
        trajectoryRiskV1,
      ),
    ).toEqual([]);
  });

  it('raises PLAN_AT_RISK when actual lags the expected line', () => {
    const risks = assessTrajectoryRisk(
      { ...base, actualWeightedCompletion: 0.28 }, // ~27 points behind
      trajectoryRiskV1,
    );
    const plan = risks.find((r) => r.type === 'PLAN_AT_RISK')!;
    expect(plan.severity).toBe('AT_RISK');
    expect(plan.lag).toBeGreaterThan(trajectoryRiskV1.planLagAtRisk);
    expect(plan.drivers.join(' ')).toMatch(/behind the plan line/);
  });

  it('a small lag is a WATCH, not AT_RISK', () => {
    const risks = assessTrajectoryRisk(
      { ...base, actualWeightedCompletion: 0.4 },
      trajectoryRiskV1,
    );
    expect(risks.find((r) => r.type === 'PLAN_AT_RISK')?.severity).toBe('WATCH');
  });

  it('raises SYLLABUS_TARGET_AT_RISK before the deadline when the pace finishes too late', () => {
    const risks = assessTrajectoryRisk(
      { ...base, actualWeightedCompletion: 0.3 }, // slow pace → late finish
      trajectoryRiskV1,
    );
    const target = risks.find((r) => r.type === 'SYLLABUS_TARGET_AT_RISK')!;
    expect(target).toBeDefined();
    expect(target.projectedFinish).not.toBeNull();
    expect(target.projectedFinish! > base.hardCompletion || target.severity === 'WATCH').toBe(true);
  });

  it('no measurable progress cannot project a finish and is AT_RISK', () => {
    const risks = assessTrajectoryRisk(
      { ...base, asOf: '2026-10-01', actualWeightedCompletion: 0 },
      trajectoryRiskV1,
    );
    const target = risks.find((r) => r.type === 'SYLLABUS_TARGET_AT_RISK')!;
    expect(target.projectedFinish).toBeNull();
    expect(target.severity).toBe('AT_RISK');
  });

  it('is version-stamped', () => {
    const risks = assessTrajectoryRisk(
      { ...base, actualWeightedCompletion: 0.2 },
      trajectoryRiskV1,
    );
    expect(risks.every((r) => r.algorithmVersion === 'trajectory-risk-v1')).toBe(true);
  });
});
