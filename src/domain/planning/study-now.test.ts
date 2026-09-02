import { describe, expect, it } from 'vitest';
import { pickStudyNow } from './study-now';
import type { PlannerCandidate } from './daily-planner';
import type { PriorityInput } from './priority';

let n = 0;
function candidate(
  over: Omit<Partial<PlannerCandidate>, 'priority'> & { priority?: Partial<PriorityInput> } = {},
): PlannerCandidate {
  n += 1;
  return {
    id: over.id ?? `C${n}`,
    subjectKey: over.subjectKey ?? 'PHY',
    subjectName: over.subjectName ?? 'Physics',
    chapterKey: over.chapterKey ?? over.id ?? `C${n}`,
    chapterName: over.chapterName ?? `Chapter ${n}`,
    activity: over.activity ?? 'PRACTISE',
    estimatedMinutes: over.estimatedMinutes ?? 0,
    prerequisitesMet: over.prerequisitesMet ?? true,
    priority: {
      effectiveReadiness: 50,
      boardWeight: 5,
      daysUntilSchoolTest: null,
      revisionDue: 'NONE',
      missedCount: 0,
      ...over.priority,
    },
  };
}

const run = (candidates: PlannerCandidate[], availableMinutes: number) =>
  pickStudyNow({ candidates, availableMinutes, asOf: '2026-09-07' });

describe('pickStudyNow', () => {
  it('returns exactly one task, deterministically', () => {
    const cs = [
      candidate({ id: 'a', priority: { effectiveReadiness: 60 } }),
      candidate({ id: 'b', priority: { effectiveReadiness: 30 } }),
      candidate({ id: 'c', priority: { effectiveReadiness: 45 } }),
    ];
    const r1 = run(cs, 45);
    const r2 = run(cs, 45);
    expect(r1).toEqual(r2);
    expect(r1.task?.candidate.id).toBe('b'); // weakest wins
  });

  it('scales the task and micro-plan to the available time', () => {
    const r = run([candidate({ id: 'x', activity: 'PRACTISE' })], 30);
    expect(r.task?.minutes).toBe(30);
    expect(r.microPlan[0]!.fromMinute).toBe(0);
    expect(r.microPlan.at(-1)!.toMinute).toBe(30);
    // steps are contiguous
    r.microPlan.forEach((s, i) => {
      if (i > 0) expect(s.fromMinute).toBe(r.microPlan[i - 1]!.toMinute);
    });
  });

  it('a school test within 3 days wins over a weaker chapter (guardrail 5)', () => {
    const cs = [
      candidate({ id: 'weakest', priority: { effectiveReadiness: 20 } }),
      candidate({ id: 'test', priority: { effectiveReadiness: 65, daysUntilSchoolTest: 2 } }),
    ];
    const r = run(cs, 45);
    expect(r.task?.candidate.id).toBe('test');
    expect(r.task?.reasons).toContain('SCHOOL_TEST_SOON');
  });

  it('returns nothing when the time is below the meaningful minimum', () => {
    expect(run([candidate()], 10).task).toBeNull();
  });

  it('skips a task that cannot be meaningfully done in the time', () => {
    const cs = [
      candidate({ id: 'long', estimatedMinutes: 90, priority: { effectiveReadiness: 10 } }),
      candidate({ id: 'short', estimatedMinutes: 20, priority: { effectiveReadiness: 40 } }),
    ];
    expect(run(cs, 25).task?.candidate.id).toBe('short');
  });

  it('ignores candidates whose prerequisites are unmet', () => {
    const cs = [
      candidate({ id: 'blocked', prerequisitesMet: false, priority: { effectiveReadiness: 5 } }),
      candidate({ id: 'ok', priority: { effectiveReadiness: 50 } }),
    ];
    expect(run(cs, 45).task?.candidate.id).toBe('ok');
  });
});
