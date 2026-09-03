import { describe, expect, it } from 'vitest';
import { planPressureV1 } from '@/config/plan-pressure';
import {
  computePlanPressure,
  type PlanPressureChapter,
  type PlanPressureInput,
} from './plan-pressure';

const chapter = (over: Partial<PlanPressureChapter> = {}): PlanPressureChapter => ({
  boardWeight: 5,
  effectiveReadiness: 50,
  examReady: false,
  ...over,
});

const input = (over: Partial<PlanPressureInput> = {}): PlanPressureInput => ({
  remainingDays: 60,
  capacityMinutes: 60 * 120, // 2h/day
  chapters: [chapter(), chapter(), chapter()],
  revisionsDue: 0,
  assessmentsUpcoming: 0,
  ...over,
});

describe('computePlanPressure', () => {
  it('is LOW when capacity comfortably covers the work', () => {
    const r = computePlanPressure(
      input({ chapters: [chapter({ effectiveReadiness: 90 })], capacityMinutes: 100000 }),
      planPressureV1,
    );
    expect(r.band).toBe('LOW');
    expect(r.deficitMinutes).toBe(0);
    expect(r.tradeoffs).toEqual([]);
  });

  it('EXAM_READY chapters carry no remaining demand', () => {
    const ready = computePlanPressure(
      input({ chapters: [chapter({ examReady: true }), chapter({ examReady: true })] }),
      planPressureV1,
    );
    expect(ready.breakdown.syllabusMinutes).toBe(0);
  });

  it('goes CRITICAL and returns trade-offs when demand exceeds capacity', () => {
    const r = computePlanPressure(
      input({
        capacityMinutes: 10 * 60, // only 10h left
        chapters: Array.from({ length: 12 }, () =>
          chapter({ effectiveReadiness: 20, boardWeight: 8 }),
        ),
        revisionsDue: 6,
        assessmentsUpcoming: 2,
      }),
      planPressureV1,
    );
    expect(r.band).toBe('CRITICAL');
    expect(r.deficitMinutes).toBeGreaterThan(0);
    expect(r.tradeoffs.map((t) => t.kind)).toEqual(
      expect.arrayContaining(['DEFER_CHAPTERS', 'ADD_DAILY_MINUTES', 'MOVE_TARGET_DAYS']),
    );
    // never silently exceeds — the deficit is surfaced, not absorbed
    expect(r.demandMinutes).toBeGreaterThan(r.capacityMinutes);
  });

  it('revision and assessment burden feed the demand and the drivers', () => {
    const withBurden = computePlanPressure(
      input({ revisionsDue: 4, assessmentsUpcoming: 3 }),
      planPressureV1,
    );
    expect(withBurden.breakdown.revisionMinutes).toBe(4 * planPressureV1.revisionMinutes);
    expect(withBurden.breakdown.assessmentMinutes).toBe(3 * planPressureV1.assessmentPrepMinutes);
    expect(withBurden.drivers.some((d) => d.includes('revisions due'))).toBe(true);
  });

  it('the ADD_DAILY_MINUTES lever clears the deficit over the remaining days', () => {
    const remainingDays = 30;
    const r = computePlanPressure(
      input({
        capacityMinutes: 180,
        remainingDays,
        chapters: Array.from({ length: 8 }, () => chapter({ effectiveReadiness: 30 })),
      }),
      planPressureV1,
    );
    expect(r.deficitMinutes).toBeGreaterThan(0);
    const add = r.tradeoffs.find((t) => t.kind === 'ADD_DAILY_MINUTES')!;
    expect(add.value * remainingDays).toBeGreaterThanOrEqual(r.deficitMinutes);
    expect(r.algorithmVersion).toBe('plan-pressure-v1');
  });
});
