import { describe, expect, it } from 'vitest';
import { addDays, clampDate, daysBetween, maxDate, minDate } from './dates';

describe('date arithmetic', () => {
  it('adds and subtracts days across month and year boundaries without month logic', () => {
    expect(addDays('2026-12-20', 11)).toBe('2026-12-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-02-01', -14)).toBe('2027-01-18');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
    expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
  });

  it('counts whole days between dates', () => {
    expect(daysBetween('2026-09-02', '2026-12-20')).toBe(109);
    expect(daysBetween('2026-12-20', '2026-09-02')).toBe(-109);
    expect(daysBetween('2026-09-02', '2026-09-02')).toBe(0);
  });

  it('min / max / clamp compare ISO strings directly', () => {
    expect(maxDate('2026-09-02', '2026-12-20')).toBe('2026-12-20');
    expect(minDate('2026-09-02', '2026-12-20')).toBe('2026-09-02');
    expect(clampDate('2026-01-01', '2026-06-01', '2026-12-01')).toBe('2026-06-01');
    expect(clampDate('2027-01-01', '2026-06-01', '2026-12-01')).toBe('2026-12-01');
    expect(clampDate('2026-08-01', '2026-06-01', '2026-12-01')).toBe('2026-08-01');
  });

  it('rejects non-ISO input', () => {
    expect(() => addDays('02-09-2026', 1)).toThrow();
  });
});
