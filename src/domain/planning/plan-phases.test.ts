import { describe, expect, it } from 'vitest';
import { phasesV1, type PlanPhaseConfig } from '@/config/phases';
import type { PlanDates } from './plan-dates';
import { resolvePhaseAt, resolvePlanPhases } from './plan-phases';

const shortPlan: PlanDates = {
  startDate: '2026-09-02',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-31',
  revisionStartDate: '2027-01-01',
  examWindowStart: '2027-02-01',
  examWindowEnd: '2027-03-31',
};

const julyToFeb: PlanDates = {
  startDate: '2025-07-01',
  syllabusTargetDate: '2025-12-15',
  hardCompletionDate: '2026-01-05',
  revisionStartDate: '2026-01-06',
  examWindowStart: '2026-02-10',
  examWindowEnd: '2026-03-20',
};

const ninetyDay: PlanDates = {
  startDate: '2026-11-01',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-28',
  revisionStartDate: '2026-12-29',
  examWindowStart: '2027-01-25',
  examWindowEnd: '2027-01-30',
};

describe('resolvePlanPhases', () => {
  it('derives five phases for the current short plan', () => {
    const phases = resolvePlanPhases(shortPlan, phasesV1);
    expect(phases.map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);
    expect(phases[0]).toMatchObject({ startDate: '2026-09-02', endDate: '2026-12-20' });
    // preboard = examWindowStart - 14 days
    expect(phases.find((p) => p.phaseType === 'PREBOARD')?.startDate).toBe('2027-01-18');
    // phases are contiguous
    for (let i = 1; i < phases.length; i++) {
      expect(phases[i]!.startDate).toBe(phases[i - 1]!.endDate);
    }
  });

  it('works for a July–February plan with no month-specific code', () => {
    const phases = resolvePlanPhases(julyToFeb, phasesV1);
    expect(phases.map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);
    expect(phases[0]!.startDate).toBe('2025-07-01');
    expect(phases.at(-1)).toMatchObject({ startDate: '2026-02-10', endDate: '2026-03-20' });
  });

  it('works for a 90-day intensive plan', () => {
    const phases = resolvePlanPhases(ninetyDay, phasesV1);
    expect(phases.map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);
  });

  it('adds a FOUNDATION phase when foundationDays > 0', () => {
    const config: PlanPhaseConfig = { ...phasesV1, foundationDays: 14 };
    const phases = resolvePlanPhases(shortPlan, config);
    expect(phases[0]).toMatchObject({
      phaseType: 'FOUNDATION',
      startDate: '2026-09-02',
      endDate: '2026-09-16',
    });
    expect(phases[1]).toMatchObject({ phaseType: 'SYLLABUS_COVERAGE', startDate: '2026-09-16' });
  });

  it('omits a phase that would be zero-length', () => {
    const tight: PlanDates = {
      ...shortPlan,
      syllabusTargetDate: '2027-01-01',
      hardCompletionDate: '2027-01-01',
      revisionStartDate: '2027-01-01',
    };
    const phases = resolvePlanPhases(tight, phasesV1);
    expect(phases.map((p) => p.phaseType)).not.toContain('CONSOLIDATION');
  });

  it('clamps PREBOARD so it never starts before REVISION', () => {
    const compressed: PlanDates = { ...ninetyDay, revisionStartDate: '2027-01-20' };
    const phases = resolvePlanPhases(compressed, phasesV1);
    const revision = phases.find((p) => p.phaseType === 'REVISION');
    const preboard = phases.find((p) => p.phaseType === 'PREBOARD');
    if (revision) expect(preboard?.startDate).toBe(revision.endDate);
    expect(preboard?.startDate).not.toBeUndefined();
    expect(preboard!.startDate >= '2027-01-20').toBe(true);
  });
});

describe('resolvePhaseAt', () => {
  const phases = resolvePlanPhases(shortPlan, phasesV1);

  it('returns the phase active on a date; a boundary day belongs to the phase beginning', () => {
    expect(resolvePhaseAt(phases, '2026-09-02')).toBe('SYLLABUS_COVERAGE');
    expect(resolvePhaseAt(phases, '2026-12-01')).toBe('SYLLABUS_COVERAGE');
    expect(resolvePhaseAt(phases, '2026-12-20')).toBe('CONSOLIDATION');
    expect(resolvePhaseAt(phases, '2027-01-18')).toBe('PREBOARD');
    expect(resolvePhaseAt(phases, '2027-02-01')).toBe('BOARD_EXAM');
    expect(resolvePhaseAt(phases, '2027-03-31')).toBe('BOARD_EXAM');
  });

  it('returns null before the plan starts and after the exam window', () => {
    expect(resolvePhaseAt(phases, '2026-09-01')).toBeNull();
    expect(resolvePhaseAt(phases, '2027-04-01')).toBeNull();
  });

  it('reflects a changed syllabus target date', () => {
    const before = resolvePlanPhases(shortPlan, phasesV1);
    const after = resolvePlanPhases({ ...shortPlan, syllabusTargetDate: '2026-11-15' }, phasesV1);
    expect(resolvePhaseAt(before, '2026-12-01')).toBe('SYLLABUS_COVERAGE');
    expect(resolvePhaseAt(after, '2026-12-01')).toBe('CONSOLIDATION');
  });
});
