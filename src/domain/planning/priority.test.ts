import { describe, expect, it } from 'vitest';
import { priorityV1 } from '@/config/priority';
import { computePriority, prioritize, type PriorityInput } from './priority';

const base: PriorityInput = {
  effectiveReadiness: 60,
  boardWeight: 5,
  daysUntilSchoolTest: null,
  revisionDue: 'NONE',
  missedCount: 0,
};

const score = (patch: Partial<PriorityInput>) =>
  computePriority({ ...base, ...patch }, priorityV1).raw;

describe('computePriority', () => {
  it('is deterministic', () => {
    expect(computePriority(base, priorityV1)).toEqual(computePriority(base, priorityV1));
  });

  it('stamps the config version', () => {
    expect(computePriority(base, priorityV1).algorithmVersion).toBe('priority-v1');
  });

  it('weakness rises monotonically as readiness falls', () => {
    const r = [90, 70, 50, 30, 10].map((effectiveReadiness) => score({ effectiveReadiness }));
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });

  it('a nearer school test raises priority (SRS scenario 1)', () => {
    const none = score({ daysUntilSchoolTest: null });
    const twoWeeks = score({ daysUntilSchoolTest: 12 });
    const threeDays = score({ daysUntilSchoolTest: 3 });
    const tomorrow = score({ daysUntilSchoolTest: 1 });
    expect(none).toBeLessThan(twoWeeks);
    expect(twoWeeks).toBeLessThan(threeDays);
    expect(threeDays).toBeLessThan(tomorrow);
    // defaults from docs/ALGORITHMS.md §3
    expect(score({ daysUntilSchoolTest: 1 }) / none).toBeCloseTo(1.8, 5);
  });

  it('a past or cancelled test carries no urgency (SRS scenario 2)', () => {
    expect(score({ daysUntilSchoolTest: -2 })).toBe(score({ daysUntilSchoolTest: null }));
  });

  it('overdue revision outranks due-today outranks not-due', () => {
    expect(score({ revisionDue: 'NONE' })).toBeLessThan(score({ revisionDue: 'DUE_TODAY' }));
    expect(score({ revisionDue: 'DUE_TODAY' })).toBeLessThan(score({ revisionDue: 'OVERDUE' }));
  });

  it('backlog pressure grows with misses but is capped', () => {
    const b0 = score({ missedCount: 0 });
    const b2 = score({ missedCount: 2 });
    const b20 = score({ missedCount: 20 });
    expect(b2).toBeGreaterThan(b0);
    expect(b20).toBeGreaterThan(b2);
    expect(b20 / b0).toBeCloseTo(1 + priorityV1.backlog.max, 5);
  });

  it('importance scales with the curriculum weight; null uses the neutral weight', () => {
    expect(score({ boardWeight: 9 })).toBeGreaterThan(score({ boardWeight: 3 }));
    expect(score({ boardWeight: null })).toBe(
      score({ boardWeight: priorityV1.importance.neutralWeight }),
    );
  });
});

describe('prioritize', () => {
  const candidates = [
    { candidate: 'strong-no-test', input: { ...base, effectiveReadiness: 88 } },
    {
      candidate: 'weak-test-tomorrow',
      input: { ...base, effectiveReadiness: 35, daysUntilSchoolTest: 1 },
    },
    {
      candidate: 'mid-overdue-revision',
      input: { ...base, effectiveReadiness: 55, revisionDue: 'OVERDUE' as const },
    },
  ];

  it('ranks highest raw first and normalises score to the set max', () => {
    const ranked = prioritize(candidates, priorityV1);
    expect(ranked.map((r) => r.candidate)).toEqual([
      'weak-test-tomorrow',
      'mid-overdue-revision',
      'strong-no-test',
    ]);
    expect(ranked[0]!.score).toBe(1);
    expect(ranked[2]!.score).toBeLessThan(1);
  });

  it('is stable for equal scores', () => {
    const dup = [
      { candidate: 'a', input: base },
      { candidate: 'b', input: base },
      { candidate: 'c', input: base },
    ];
    expect(prioritize(dup, priorityV1).map((r) => r.candidate)).toEqual(['a', 'b', 'c']);
  });

  it('removing the test restores the no-test ordering (SRS scenario 2)', () => {
    const withTest = prioritize(candidates, priorityV1).map((r) => r.candidate);
    const cancelled = candidates.map((c) =>
      c.candidate === 'weak-test-tomorrow'
        ? { ...c, input: { ...c.input, daysUntilSchoolTest: null } }
        : c,
    );
    const after = prioritize(cancelled, priorityV1).map((r) => r.candidate);
    expect(withTest[0]).toBe('weak-test-tomorrow');
    expect(after).toEqual(['mid-overdue-revision', 'weak-test-tomorrow', 'strong-no-test']);
  });
});
