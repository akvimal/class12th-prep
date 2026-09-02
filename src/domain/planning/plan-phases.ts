import type { PlanPhaseConfig } from '@/config/phases';
import { addDays, clampDate, minDate } from './dates';
import type { PlanDates } from './plan-dates';
import type { PhaseType } from './plan';

/**
 * Deriving the six semantic phases (docs/SRS.md §5) from a plan's configured
 * dates. Purely date-driven — no calendar-month logic. A phase that would be
 * zero-length is omitted, so a tight plan simply has fewer phases.
 *
 *   FOUNDATION         start .. start+foundationDays   (only if foundationDays > 0)
 *   SYLLABUS_COVERAGE  .. syllabusTargetDate
 *   CONSOLIDATION      .. revisionStartDate
 *   REVISION           .. preboardStart
 *   PREBOARD           .. examWindowStart
 *   BOARD_EXAM         .. examWindowEnd
 *
 * `preboardStart = clamp(examWindowStart - preboardLeadDays, revisionStartDate, examWindowStart)`.
 */

export interface PhaseSpec {
  phaseType: PhaseType;
  startDate: string;
  endDate: string;
}

export function resolvePlanPhases(dates: PlanDates, config: PlanPhaseConfig): PhaseSpec[] {
  const foundationEnd = minDate(
    addDays(dates.startDate, Math.max(0, config.foundationDays)),
    dates.syllabusTargetDate,
  );
  const preboardStart = clampDate(
    addDays(dates.examWindowStart, -Math.max(0, config.preboardLeadDays)),
    dates.revisionStartDate,
    dates.examWindowStart,
  );

  const candidates: PhaseSpec[] = [
    { phaseType: 'FOUNDATION', startDate: dates.startDate, endDate: foundationEnd },
    { phaseType: 'SYLLABUS_COVERAGE', startDate: foundationEnd, endDate: dates.syllabusTargetDate },
    {
      phaseType: 'CONSOLIDATION',
      startDate: dates.syllabusTargetDate,
      endDate: dates.revisionStartDate,
    },
    { phaseType: 'REVISION', startDate: dates.revisionStartDate, endDate: preboardStart },
    { phaseType: 'PREBOARD', startDate: preboardStart, endDate: dates.examWindowStart },
    { phaseType: 'BOARD_EXAM', startDate: dates.examWindowStart, endDate: dates.examWindowEnd },
  ];

  return candidates.filter((p) => p.startDate < p.endDate);
}

/**
 * Which phase is active on `date`. A boundary day belongs to the phase that is
 * beginning. Returns null before the plan starts or after the exam window ends.
 */
export function resolvePhaseAt(phases: PhaseSpec[], date: string): PhaseType | null {
  if (phases.length === 0) return null;
  for (const phase of phases) {
    if (phase.startDate <= date && date < phase.endDate) return phase.phaseType;
  }
  const last = phases[phases.length - 1]!;
  if (date === last.endDate) return last.phaseType;
  return null;
}
