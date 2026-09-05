import { describe, expect, it } from 'vitest';
import { satPrepV1 } from '@/config/sat-prep';
import { addDays } from '@/domain/planning/dates';
import type { SatDomainPriority } from './sat-domain';
import { buildSatPrepWeeks } from './sat-plan';

const priorities: SatDomainPriority[] = [
  {
    domain: 'STANDARD_ENGLISH_CONVENTIONS',
    section: 'READING_WRITING',
    latestBand: { low: 610, high: 670 },
    previousBand: { low: 610, high: 670 },
    trend: 'FLAT',
    priorityScore: 149.5,
  },
  {
    domain: 'GEOMETRY_TRIGONOMETRY',
    section: 'MATH',
    latestBand: { low: 610, high: 670 },
    previousBand: { low: 680, high: 800 },
    trend: 'REGRESSED',
    priorityScore: 169,
  },
];

describe('buildSatPrepWeeks', () => {
  it('is empty when the test date is within a week of the start', () => {
    expect(buildSatPrepWeeks('2026-09-05', '2026-09-10', priorities, satPrepV1)).toEqual([]);
  });

  it('splits a 9-week window into diagnostic → correction → consolidation → taper', () => {
    const weeks = buildSatPrepWeeks('2026-09-05', '2026-11-07', priorities, satPrepV1);
    expect(weeks).toHaveLength(9);
    expect(weeks.map((w) => w.phase)).toEqual([
      'DIAGNOSTIC',
      'DIAGNOSTIC',
      'DIAGNOSTIC',
      'CORRECTION',
      'CORRECTION',
      'CORRECTION',
      'CONSOLIDATION',
      'CONSOLIDATION',
      'TAPER',
    ]);
  });

  it('gives every non-taper week the top-priority domains as focus, and none to taper', () => {
    const weeks = buildSatPrepWeeks('2026-09-05', '2026-11-07', priorities, satPrepV1);
    for (const w of weeks) {
      if (w.phase === 'TAPER') expect(w.focusDomains).toEqual([]);
      else
        expect(w.focusDomains).toEqual(['STANDARD_ENGLISH_CONVENTIONS', 'GEOMETRY_TRIGONOMETRY']);
    }
  });

  it('schedules a full practice test at the end of diagnostic and every consolidation week', () => {
    const weeks = buildSatPrepWeeks('2026-09-05', '2026-11-07', priorities, satPrepV1);
    expect(weeks[2]!.fullPracticeTest).toBe(true); // last diagnostic week
    expect(weeks[6]!.fullPracticeTest).toBe(true); // consolidation
    expect(weeks[7]!.fullPracticeTest).toBe(true); // consolidation
    expect(weeks[8]!.fullPracticeTest).toBe(false); // taper — no new tests
  });

  it('degrades gracefully for a short window by shrinking diagnostic/correction first', () => {
    const weeks = buildSatPrepWeeks('2026-09-05', '2026-10-03', priorities, satPrepV1);
    expect(weeks).toHaveLength(4);
    // taper (1) + consolidation (2) leaves 1 week, which goes to diagnostic.
    expect(weeks.map((w) => w.phase)).toEqual([
      'DIAGNOSTIC',
      'CONSOLIDATION',
      'CONSOLIDATION',
      'TAPER',
    ]);
  });

  it('produces contiguous, non-overlapping week date ranges', () => {
    const weeks = buildSatPrepWeeks('2026-09-05', '2026-11-07', priorities, satPrepV1);
    expect(weeks[0]!.startDate).toBe('2026-09-05');
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i]!.startDate).toBe(addDays(weeks[i - 1]!.endDate, 1));
    }
  });
});
