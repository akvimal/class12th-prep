import type { PlanPressureConfig } from '@/config/plan-pressure';

export const PLAN_PRESSURE_BANDS = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const;
export type PlanPressureBand = (typeof PLAN_PRESSURE_BANDS)[number];

export interface PlanPressureChapter {
  /** Board weight, or null → the config neutral. */
  boardWeight: number | null;
  /** 0..100, or null when unknown (treated as 0 — full gap). */
  effectiveReadiness: number | null;
  /** EXAM_READY chapters carry no remaining demand. */
  examReady: boolean;
}

export interface PlanPressureInput {
  /** Usable study days from `asOf` to the syllabus target (inclusive lower bound at 0). */
  remainingDays: number;
  /** Real capacity minutes over that window (school calendar applied). */
  capacityMinutes: number;
  chapters: PlanPressureChapter[];
  /** Scheduled revisions due on/before the syllabus target. */
  revisionsDue: number;
  /** Upcoming school assessments on/before the syllabus target. */
  assessmentsUpcoming: number;
}

export interface PlanPressureTradeoff {
  kind: 'DEFER_CHAPTERS' | 'ADD_DAILY_MINUTES' | 'MOVE_TARGET_DAYS';
  value: number;
  label: string;
}

export interface PlanPressure {
  band: PlanPressureBand;
  /** demand ÷ capacity. */
  ratio: number;
  demandMinutes: number;
  capacityMinutes: number;
  /** demand − capacity, floored at 0. */
  deficitMinutes: number;
  breakdown: {
    syllabusMinutes: number;
    revisionMinutes: number;
    assessmentMinutes: number;
  };
  drivers: string[];
  /** Only when there is a deficit — never silently exceed capacity. */
  tradeoffs: PlanPressureTradeoff[];
  algorithmVersion: string;
}

function bandFor(ratio: number, config: PlanPressureConfig): PlanPressureBand {
  if (ratio <= config.bands.low) return 'LOW';
  if (ratio <= config.bands.normal) return 'NORMAL';
  if (ratio <= config.bands.high) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Deterministic plan pressure (docs/ALGORITHMS.md §8). Weighs the weighted
 * syllabus still to cover, plus revision and assessment burden, against the
 * real capacity left before the syllabus target. When demand exceeds capacity
 * it returns concrete trade-offs rather than assuming the extra hours exist.
 */
export function computePlanPressure(
  input: PlanPressureInput,
  config: PlanPressureConfig,
): PlanPressure {
  const weightOf = (c: PlanPressureChapter) => c.boardWeight ?? config.neutralChapterWeight;

  let weightedGap = 0;
  for (const c of input.chapters) {
    if (c.examReady) continue;
    const gap = 1 - Math.max(0, Math.min(100, c.effectiveReadiness ?? 0)) / 100;
    weightedGap += weightOf(c) * gap;
  }

  const syllabusMinutes = Math.round(weightedGap * config.minutesPerWeightGapPoint);
  const revisionMinutes = input.revisionsDue * config.revisionMinutes;
  const assessmentMinutes = input.assessmentsUpcoming * config.assessmentPrepMinutes;
  const demandMinutes = syllabusMinutes + revisionMinutes + assessmentMinutes;

  const capacityMinutes = Math.max(0, input.capacityMinutes);
  const ratio = capacityMinutes > 0 ? demandMinutes / capacityMinutes : demandMinutes > 0 ? 99 : 0;
  const band = bandFor(ratio, config);
  const deficitMinutes = Math.max(0, demandMinutes - capacityMinutes);

  const drivers: string[] = [
    `${Math.round(demandMinutes / 60)}h of work left vs. ${Math.round(capacityMinutes / 60)}h capacity in ${input.remainingDays} days`,
  ];
  if (syllabusMinutes > 0) {
    drivers.push(`~${Math.round(syllabusMinutes / 60)}h weighted syllabus still to cover`);
  }
  if (revisionMinutes > 0) drivers.push(`${input.revisionsDue} revisions due before the target`);
  if (assessmentMinutes > 0) {
    drivers.push(`${input.assessmentsUpcoming} school test(s) to prepare for`);
  }

  const tradeoffs: PlanPressureTradeoff[] = [];
  if (deficitMinutes > 0) {
    // 1. Defer the lowest-weight not-ready chapters until the deficit clears.
    const perChapter = [...input.chapters]
      .filter((c) => !c.examReady)
      .map((c) => {
        const gap = 1 - Math.max(0, Math.min(100, c.effectiveReadiness ?? 0)) / 100;
        return weightOf(c) * gap * config.minutesPerWeightGapPoint;
      })
      .sort((a, b) => a - b);
    let freed = 0;
    let deferred = 0;
    for (const m of perChapter) {
      if (freed >= deficitMinutes) break;
      freed += m;
      deferred += 1;
    }
    if (deferred > 0) {
      tradeoffs.push({
        kind: 'DEFER_CHAPTERS',
        value: deferred,
        label: `Defer ${deferred} low-weight chapter${deferred > 1 ? 's' : ''} to the consolidation phase`,
      });
    }

    // 2. Spread the deficit across the remaining days.
    if (input.remainingDays > 0) {
      const perDay = Math.ceil(deficitMinutes / input.remainingDays);
      tradeoffs.push({
        kind: 'ADD_DAILY_MINUTES',
        value: perDay,
        label: `Add ~${perDay} min/day until the syllabus target`,
      });
    }

    // 3. Push the target out at the current daily rate.
    const perDayCapacity =
      input.remainingDays > 0 ? capacityMinutes / input.remainingDays : capacityMinutes;
    if (perDayCapacity > 0) {
      const extraDays = Math.ceil(deficitMinutes / perDayCapacity);
      tradeoffs.push({
        kind: 'MOVE_TARGET_DAYS',
        value: extraDays,
        label: `Move the syllabus target ${extraDays} day${extraDays > 1 ? 's' : ''} later`,
      });
    }
  }

  return {
    band,
    ratio: Math.round(ratio * 100) / 100,
    demandMinutes,
    capacityMinutes,
    deficitMinutes,
    breakdown: { syllabusMinutes, revisionMinutes, assessmentMinutes },
    drivers,
    tradeoffs,
    algorithmVersion: config.version,
  };
}
