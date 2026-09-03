import type { CourseCorrectionConfig } from '@/config/course-correction';
import type { PlanPressureBand } from './plan-pressure';

export const COURSE_CORRECTION_KINDS = ['REPRIORITISE', 'ADD_CAPACITY', 'MOVE_TARGET'] as const;
export type CourseCorrectionKind = (typeof COURSE_CORRECTION_KINDS)[number];

export interface CourseCorrectionInput {
  pressureBand: PlanPressureBand;
  /** Work minutes over capacity to the syllabus target; 0 when none. */
  deficitMinutes: number;
  /** Usable days left to the syllabus target. */
  remainingDays: number;
  /** Current weekday capacity, minutes. */
  weekdayCapacityMinutes: number;
  /** How many chapters are below the readiness floor. */
  weakChapterCount: number;
  /** Projected-vs-target gap in points, if a projection exists (else null). */
  projectionGap: number | null;
}

export interface CourseCorrection {
  kind: CourseCorrectionKind;
  title: string;
  /** The cost, in the student's terms. */
  tradeoff: string;
  detail: string;
  /** Human-readable estimated effect. */
  projectedEffect: string;
  /** Machine payload for the apply action. */
  params: Record<string, number>;
  requiresConfirmation: boolean;
}

/**
 * Deterministically propose 2–3 concrete plan adjustments when the plan is
 * under pressure (docs/ALGORITHMS.md §8). Returns an empty list when the
 * pressure band is below the trigger — there is nothing to correct. Every
 * proposal is a forward-only diff; none touch recorded evidence.
 */
export function generateCourseCorrections(
  input: CourseCorrectionInput,
  config: CourseCorrectionConfig,
): CourseCorrection[] {
  if (!config.triggerBands.includes(input.pressureBand)) return [];

  const out: CourseCorrection[] = [];
  const weeklyDeficitHours =
    input.remainingDays > 0
      ? ((input.deficitMinutes / input.remainingDays) * 7) / 60
      : input.deficitMinutes / 60;
  const gainPer = config.projectedPointsPerAddedHourPerWeek;

  // 1. Reprioritise — always available, no time cost.
  out.push({
    kind: 'REPRIORITISE',
    title: 'Reprioritise the queue',
    tradeoff: 'No extra time',
    detail: `Pin the ${Math.max(1, input.weakChapterCount)} weakest critical-path chapter${
      input.weakChapterCount === 1 ? '' : 's'
    } to the top for ${config.reprioritiseDays} days; already-strong chapters wait for the consolidation phase.`,
    projectedEffect:
      input.projectionGap != null && input.projectionGap > 0
        ? `closes ~${Math.min(input.projectionGap, 4)} of the ${input.projectionGap}-point gap · target date unchanged`
        : 'keeps the weak chapters moving · target date unchanged',
    params: { days: config.reprioritiseDays },
    requiresConfirmation: false,
  });

  if (input.deficitMinutes > 0) {
    // 2. Add weekday capacity — needs confirmation.
    const step =
      config.capacityStepsMinutes.find((m) => (m * 5) / 60 >= weeklyDeficitHours * 0.6) ??
      config.capacityStepsMinutes[config.capacityStepsMinutes.length - 1]!;
    const addedHoursPerWeek = (step * 5) / 60;
    out.push({
      kind: 'ADD_CAPACITY',
      title: `Add ${step} min on weekdays`,
      tradeoff: `+${addedHoursPerWeek.toFixed(1)}h / week`,
      detail: `Raise the weekday study block from ${input.weekdayCapacityMinutes} to ${
        input.weekdayCapacityMinutes + step
      } minutes until the syllabus target. Weekend load unchanged.`,
      projectedEffect: `+${(addedHoursPerWeek * gainPer).toFixed(0)} projected · eases the deficit by ~${Math.round(
        (addedHoursPerWeek / 7) * input.remainingDays * 60,
      )} min`,
      params: { weekdayMinutesDelta: step },
      requiresConfirmation: true,
    });

    // 3. Move the syllabus target later.
    const perDayCapacity =
      input.remainingDays > 0
        ? input.weekdayCapacityMinutes // rough proxy for a day's capacity
        : input.weekdayCapacityMinutes;
    const shiftDays = Math.min(
      config.maxTargetShiftDays,
      Math.max(1, Math.ceil(input.deficitMinutes / Math.max(1, perDayCapacity))),
    );
    out.push({
      kind: 'MOVE_TARGET',
      title: 'Move the syllabus target',
      tradeoff: `Revision window −${shiftDays} day${shiftDays === 1 ? '' : 's'}`,
      detail: `Shift the syllabus target ${shiftDays} day${
        shiftDays === 1 ? '' : 's'
      } later. The consolidation phase absorbs the shift; the pre-board buffer is protected.`,
      projectedEffect: `demand fits capacity · revision starts ${shiftDays} day${
        shiftDays === 1 ? '' : 's'
      } later`,
      params: { targetShiftDays: shiftDays },
      requiresConfirmation: false,
    });
  }

  return out;
}
