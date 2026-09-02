import { describe, expect, it } from 'vitest';
import { plannerV1 } from '@/config/planner';
import { buildDailyPlan, type PlannerCandidate } from './daily-planner';
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
    estimatedMinutes: over.estimatedMinutes ?? 40,
    prerequisitesMet: over.prerequisitesMet ?? true,
    priority: {
      effectiveReadiness: 55,
      boardWeight: 5,
      daysUntilSchoolTest: null,
      revisionDue: 'NONE',
      missedCount: 0,
      ...over.priority,
    },
  };
}

const plan = (
  candidates: PlannerCandidate[],
  opts: Partial<Parameters<typeof buildDailyPlan>[0]> = {},
) =>
  buildDailyPlan({ candidates, capacityMinutes: 150, energy: 'OK', asOf: '2026-09-07', ...opts });

describe('buildDailyPlan', () => {
  it('is deterministic and caps the primary set at the configured max', () => {
    const cs = Array.from({ length: 8 }, (_, i) =>
      candidate({ id: `x${i}`, subjectKey: `S${i}`, priority: { effectiveReadiness: 20 + i } }),
    );
    const a = plan(cs);
    const b = plan(cs);
    expect(a).toEqual(b);
    expect(a.primary).toHaveLength(plannerV1.maxPrimaryTasks);
  });

  it('drops candidates whose prerequisites are not met (guardrail 1)', () => {
    const cs = [
      candidate({ id: 'ready', priority: { effectiveReadiness: 30 } }),
      candidate({ id: 'blocked', prerequisitesMet: false, priority: { effectiveReadiness: 10 } }),
    ];
    expect(plan(cs).primary.map((t) => t.candidate.id)).toEqual(['ready']);
  });

  it('keeps at most maxPerSubject primary cards from one subject (guardrail 3)', () => {
    const cs = [
      candidate({ id: 'p1', subjectKey: 'PHY', priority: { effectiveReadiness: 10 } }),
      candidate({ id: 'p2', subjectKey: 'PHY', priority: { effectiveReadiness: 15 } }),
      candidate({ id: 'p3', subjectKey: 'PHY', priority: { effectiveReadiness: 20 } }),
      candidate({ id: 'm1', subjectKey: 'MAT', priority: { effectiveReadiness: 25 } }),
    ];
    const ids = plan(cs).primary.map((t) => t.candidate.id);
    expect(ids.filter((x) => x.startsWith('p'))).toHaveLength(plannerV1.maxPerSubject);
    expect(ids).toContain('m1');
  });

  it('forces a chapter with a school test in ≤3 days into the primary set (SRS 1 & guardrail 5)', () => {
    const cs = [
      candidate({ id: 'strong', subjectKey: 'MAT', priority: { effectiveReadiness: 88 } }),
      candidate({ id: 'strong2', subjectKey: 'CHE', priority: { effectiveReadiness: 85 } }),
      candidate({ id: 'strong3', subjectKey: 'CS', priority: { effectiveReadiness: 82 } }),
      candidate({
        id: 'test-soon',
        subjectKey: 'PHY',
        priority: { effectiveReadiness: 70, daysUntilSchoolTest: 2 },
      }),
    ];
    const out = plan(cs);
    expect(out.primary.map((t) => t.candidate.id)).toContain('test-soon');
    expect(out.primary.find((t) => t.candidate.id === 'test-soon')!.reasons).toContain(
      'SCHOOL_TEST_SOON',
    );
  });

  it('the test forces a chapter up; cancelling it returns to the natural ranking (SRS 1 & 2)', () => {
    const cs = [
      candidate({ id: 'weak1', subjectKey: 'MAT', priority: { effectiveReadiness: 40 } }),
      candidate({ id: 'weak2', subjectKey: 'CHE', priority: { effectiveReadiness: 42 } }),
      candidate({ id: 'weak3', subjectKey: 'CS', priority: { effectiveReadiness: 44 } }),
      candidate({ id: 'chap', subjectKey: 'PHY', priority: { effectiveReadiness: 72 } }),
    ];
    const withTest = cs.map((c) =>
      c.id === 'chap' ? { ...c, priority: { ...c.priority, daysUntilSchoolTest: 2 } } : c,
    );
    expect(plan(withTest).primary.map((t) => t.candidate.id)).toContain('chap');
    expect(plan(cs).primary.map((t) => t.candidate.id)).not.toContain('chap');
  });

  it('guarantees a revision task when one is due (guardrail 4)', () => {
    const cs = [
      candidate({ id: 'weak1', subjectKey: 'MAT', priority: { effectiveReadiness: 20 } }),
      candidate({ id: 'weak2', subjectKey: 'CHE', priority: { effectiveReadiness: 22 } }),
      candidate({ id: 'weak3', subjectKey: 'CS', priority: { effectiveReadiness: 25 } }),
      candidate({
        id: 'rev',
        subjectKey: 'PHY',
        activity: 'REVISION',
        priority: { effectiveReadiness: 68, revisionDue: 'OVERDUE' },
      }),
    ];
    const out = plan(cs);
    expect(out.primary.some((t) => t.candidate.activity === 'REVISION')).toBe(true);
    expect(out.primary.find((t) => t.candidate.id === 'rev')!.reasons).toContain('REVISION_GUARD');
  });

  it('forces a long-starved task in regardless of score (guardrail 6)', () => {
    const cs = [
      candidate({ id: 'a', subjectKey: 'MAT', priority: { effectiveReadiness: 10 } }),
      candidate({ id: 'b', subjectKey: 'CHE', priority: { effectiveReadiness: 12 } }),
      candidate({ id: 'c', subjectKey: 'CS', priority: { effectiveReadiness: 15 } }),
      candidate({
        id: 'stale',
        subjectKey: 'PHY',
        priority: { effectiveReadiness: 90, missedCount: 4 },
      }),
    ];
    const out = plan(cs);
    expect(out.primary.map((t) => t.candidate.id)).toContain('stale');
    expect(out.primary.find((t) => t.candidate.id === 'stale')!.reasons).toContain(
      'STARVATION_GUARD',
    );
  });

  it('scales the target by the energy factor but reports real capacity', () => {
    const cs = Array.from({ length: 5 }, (_, i) => candidate({ id: `e${i}`, subjectKey: `S${i}` }));
    const low = plan(cs, { energy: 'LOW' });
    expect(low.capacityMinutes).toBe(150);
    expect(low.targetMinutes).toBe(Math.round(150 * plannerV1.energyCapacityFactor.LOW));
    expect(low.plannedMinutes).toBeLessThanOrEqual(plan(cs, { energy: 'OK' }).plannedMinutes + 40);
  });

  it('exposes leftover time as optional tasks, never beyond the max', () => {
    const cs = Array.from({ length: 8 }, (_, i) =>
      candidate({ id: `o${i}`, subjectKey: `S${i}`, estimatedMinutes: 20 }),
    );
    const out = plan(cs, { capacityMinutes: 300 });
    expect(out.optional.length).toBeLessThanOrEqual(plannerV1.maxOptionalTasks);
    expect(
      out.optional.every((t) => !out.primary.some((p) => p.candidate.id === t.candidate.id)),
    ).toBe(true);
  });

  it('handles an empty queue', () => {
    const out = plan([]);
    expect(out.primary).toHaveLength(0);
    expect(out.unfilledMinutes).toBe(out.targetMinutes);
  });
});
