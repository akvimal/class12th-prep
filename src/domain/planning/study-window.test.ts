import { describe, expect, it } from 'vitest';
import {
  assertStudyWindow,
  isWeekend,
  plannedMinutesOn,
  StudyWindowError,
  validateStudyWindow,
  windowAppliesOn,
  windowMinutes,
} from './study-window';

describe('validateStudyWindow', () => {
  it('accepts a well-formed window', () => {
    expect(
      validateStudyWindow({ dayType: 'WEEKDAY', startTime: '17:00', endTime: '18:30' }),
    ).toEqual([]);
  });

  it('rejects bad times and a non-positive range', () => {
    expect(
      validateStudyWindow({ dayType: 'WEEKDAY', startTime: '25:00', endTime: '9:5' }).map(
        (v) => v.field,
      ),
    ).toEqual(['startTime', 'endTime']);
    expect(
      validateStudyWindow({ dayType: 'WEEKDAY', startTime: '18:00', endTime: '17:00' }).map(
        (v) => v.field,
      ),
    ).toEqual(['endTime']);
  });

  it('assert throws StudyWindowError', () => {
    expect(() =>
      assertStudyWindow({ dayType: 'WEEKDAY', startTime: '18:00', endTime: '18:00' }),
    ).toThrow(StudyWindowError);
  });
});

describe('windowMinutes', () => {
  it('is the span in minutes', () => {
    expect(windowMinutes({ dayType: 'DAILY', startTime: '09:30', endTime: '13:00' })).toBe(210);
  });
});

describe('recurrence', () => {
  it('classifies weekends (Sat/Sun) from an ISO date', () => {
    expect(isWeekend('2026-09-05')).toBe(true); // Saturday
    expect(isWeekend('2026-09-06')).toBe(true); // Sunday
    expect(isWeekend('2026-09-07')).toBe(false); // Monday
  });

  it('windowAppliesOn respects the day type', () => {
    expect(windowAppliesOn('WEEKDAY', '2026-09-07')).toBe(true);
    expect(windowAppliesOn('WEEKDAY', '2026-09-05')).toBe(false);
    expect(windowAppliesOn('WEEKEND', '2026-09-05')).toBe(true);
    expect(windowAppliesOn('DAILY', '2026-09-05')).toBe(true);
  });
});

describe('plannedMinutesOn', () => {
  const windows = [
    { dayType: 'WEEKDAY' as const, startTime: '17:00', endTime: '18:30', enabled: true },
    { dayType: 'WEEKDAY' as const, startTime: '20:30', endTime: '21:15', enabled: true },
    { dayType: 'WEEKEND' as const, startTime: '09:30', endTime: '13:00', enabled: true },
    { dayType: 'DAILY' as const, startTime: '07:00', endTime: '07:30', enabled: false },
  ];

  it('sums enabled windows that apply on the date', () => {
    expect(plannedMinutesOn(windows, '2026-09-07')).toBe(90 + 45); // Monday
    expect(plannedMinutesOn(windows, '2026-09-05')).toBe(210); // Saturday
  });

  it('ignores disabled windows', () => {
    const withDisabledOn = [...windows, { ...windows[3]!, enabled: false }];
    expect(plannedMinutesOn(withDisabledOn, '2026-09-07')).toBe(135);
  });
});
