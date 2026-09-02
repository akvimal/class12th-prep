import { describe, expect, it } from 'vitest';
import { resolveTaskStatus } from './study-task';

describe('resolveTaskStatus', () => {
  it('leaves today and future tasks alone', () => {
    expect(
      resolveTaskStatus({
        plannedDate: '2026-09-02',
        asOf: '2026-09-02',
        hadQualifyingSession: false,
      }),
    ).toBeNull();
    expect(
      resolveTaskStatus({
        plannedDate: '2026-09-05',
        asOf: '2026-09-02',
        hadQualifyingSession: false,
      }),
    ).toBeNull();
  });

  it('a past day with matching work is COMPLETED', () => {
    expect(
      resolveTaskStatus({
        plannedDate: '2026-09-01',
        asOf: '2026-09-02',
        hadQualifyingSession: true,
      }),
    ).toBe('COMPLETED');
  });

  it('a past day with no matching work is MISSED', () => {
    expect(
      resolveTaskStatus({
        plannedDate: '2026-09-01',
        asOf: '2026-09-02',
        hadQualifyingSession: false,
      }),
    ).toBe('MISSED');
  });
});
