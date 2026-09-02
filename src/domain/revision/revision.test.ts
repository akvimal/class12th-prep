import { describe, expect, it } from 'vitest';
import { revisionV1 } from '@/config/revision';
import { baseInterval, firstRevision, nextRevision, revisionDueState } from './revision';

describe('firstRevision', () => {
  it('schedules revision 1 one day after learning', () => {
    const r = firstRevision('2026-09-01');
    expect(r).toMatchObject({ revisionNumber: 1, intervalDays: 1, dueDate: '2026-09-02' });
    expect(r.method).toBe('ACTIVE_RECALL');
  });
});

describe('nextRevision — successful learning walks 1,3,7,14,30 (SRS scenario 4)', () => {
  it('MODERATE outcomes follow the base intervals', () => {
    let on = '2026-09-02'; // revision 1 done
    const gaps: number[] = [];
    let num = 1;
    for (let i = 0; i < 4; i++) {
      const r = nextRevision(num, 'MODERATE', on, revisionV1);
      gaps.push(r.intervalDays);
      num = r.revisionNumber;
      on = r.dueDate;
    }
    expect(gaps).toEqual([3, 7, 14, 30]);
  });

  it('past the interval list, the last gap repeats (capped)', () => {
    const r = nextRevision(6, 'MODERATE', '2026-09-02', revisionV1);
    expect(r.revisionNumber).toBe(7);
    expect(r.intervalDays).toBe(Math.min(revisionV1.maxIntervalDays, 30));
  });
});

describe('outcome effects (SRS scenario 5)', () => {
  it('STRONG extends the next interval', () => {
    const strong = nextRevision(2, 'STRONG', '2026-09-02', revisionV1);
    const moderate = nextRevision(2, 'MODERATE', '2026-09-02', revisionV1);
    expect(strong.intervalDays).toBeGreaterThan(moderate.intervalDays);
    expect(strong.intervalDays).toBe(Math.round(baseInterval(3) * revisionV1.extendFactor));
  });

  it('WEAK shortens the interval and switches to targeted practice', () => {
    const weak = nextRevision(2, 'WEAK', '2026-09-02', revisionV1);
    const moderate = nextRevision(2, 'MODERATE', '2026-09-02', revisionV1);
    expect(weak.intervalDays).toBeLessThan(moderate.intervalDays);
    expect(weak.method).toBe('PRACTISE');
  });

  it('FAILED relearns from revision 1 with an early retest', () => {
    const failed = nextRevision(4, 'FAILED', '2026-09-02', revisionV1);
    expect(failed.revisionNumber).toBe(1);
    expect(failed.intervalDays).toBe(revisionV1.relearnRetestDays);
    expect(failed.dueDate).toBe('2026-09-03');
    expect(failed.method).toBe('PRACTISE');
  });

  it('never produces an interval below 1 or above the cap', () => {
    for (const outcome of ['STRONG', 'MODERATE', 'WEAK', 'FAILED'] as const) {
      for (let n = 1; n <= 10; n++) {
        const r = nextRevision(n, outcome, '2026-09-02', revisionV1);
        expect(r.intervalDays).toBeGreaterThanOrEqual(1);
        expect(r.intervalDays).toBeLessThanOrEqual(revisionV1.maxIntervalDays);
      }
    }
  });

  it('is deterministic', () => {
    expect(nextRevision(3, 'STRONG', '2026-09-02')).toEqual(
      nextRevision(3, 'STRONG', '2026-09-02'),
    );
  });
});

describe('revisionDueState', () => {
  it('classifies against the reference date', () => {
    expect(revisionDueState('2026-09-10', '2026-09-08')).toBe('NONE');
    expect(revisionDueState('2026-09-10', '2026-09-10')).toBe('DUE_TODAY');
    expect(revisionDueState('2026-09-10', '2026-09-12')).toBe('OVERDUE');
  });
});
