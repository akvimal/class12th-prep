import { describe, expect, it } from 'vitest';
import { courseCorrectionV1 } from '@/config/course-correction';
import { generateCourseCorrections, type CourseCorrectionInput } from './course-correction';

const base: CourseCorrectionInput = {
  pressureBand: 'CRITICAL',
  deficitMinutes: 600,
  remainingDays: 20,
  weekdayCapacityMinutes: 120,
  weakChapterCount: 3,
  projectionGap: 9,
};

describe('generateCourseCorrections', () => {
  it('proposes nothing when the plan is not under pressure', () => {
    expect(
      generateCourseCorrections({ ...base, pressureBand: 'NORMAL' }, courseCorrectionV1),
    ).toEqual([]);
    expect(generateCourseCorrections({ ...base, pressureBand: 'LOW' }, courseCorrectionV1)).toEqual(
      [],
    );
  });

  it('always offers a no-time-cost reprioritise, plus capacity + target levers on a deficit', () => {
    const out = generateCourseCorrections(base, courseCorrectionV1);
    expect(out.map((c) => c.kind)).toEqual(['REPRIORITISE', 'ADD_CAPACITY', 'MOVE_TARGET']);
    expect(out[0]!.requiresConfirmation).toBe(false);
    expect(out[0]!.tradeoff).toMatch(/no extra time/i);
  });

  it('the capacity increase requires confirmation; the others do not', () => {
    const out = generateCourseCorrections(base, courseCorrectionV1);
    expect(out.find((c) => c.kind === 'ADD_CAPACITY')!.requiresConfirmation).toBe(true);
    expect(out.find((c) => c.kind === 'MOVE_TARGET')!.requiresConfirmation).toBe(false);
  });

  it('drops the capacity/target levers when there is pressure but no minute deficit', () => {
    const out = generateCourseCorrections(
      { ...base, deficitMinutes: 0, pressureBand: 'HIGH' },
      courseCorrectionV1,
    );
    expect(out.map((c) => c.kind)).toEqual(['REPRIORITISE']);
  });

  it('the target shift is capped by config', () => {
    const out = generateCourseCorrections({ ...base, deficitMinutes: 100000 }, courseCorrectionV1);
    const move = out.find((c) => c.kind === 'MOVE_TARGET')!;
    expect(move.params.targetShiftDays).toBeLessThanOrEqual(courseCorrectionV1.maxTargetShiftDays);
  });

  it('carries machine params for the apply step', () => {
    const out = generateCourseCorrections(base, courseCorrectionV1);
    expect(out.find((c) => c.kind === 'ADD_CAPACITY')!.params.weekdayMinutesDelta).toBeGreaterThan(
      0,
    );
    expect(out.find((c) => c.kind === 'MOVE_TARGET')!.params.targetShiftDays).toBeGreaterThan(0);
  });
});
