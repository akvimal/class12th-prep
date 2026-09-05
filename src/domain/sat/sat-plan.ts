import type { SatPrepConfig } from '@/config/sat-prep';
import { addDays, daysBetween } from '@/domain/planning/dates';
import type { SatDomain, SatDomainPriority } from './sat-domain';

export type SatPrepPhase = 'DIAGNOSTIC' | 'CORRECTION' | 'CONSOLIDATION' | 'TAPER';

export interface SatPrepWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  phase: SatPrepPhase;
  focusDomains: SatDomain[];
  fullPracticeTest: boolean;
}

/**
 * Splits the weeks between `startDate` and `testDate` into phases — diagnostic
 * (isolate whether a stuck domain is a content gap or a pacing problem),
 * correction (targeted drills on the top-priority domains), consolidation
 * (full timed practice tests + review), taper (no new content) — and assigns
 * each non-taper week a focus from `priorities` (most urgent first).
 *
 * Phase lengths are clamped from `config` in taper → consolidation →
 * diagnostic → remainder-is-correction order, so a short window degrades
 * gracefully instead of producing a negative-length phase.
 */
export function buildSatPrepWeeks(
  startDate: string,
  testDate: string,
  priorities: SatDomainPriority[],
  config: SatPrepConfig,
): SatPrepWeek[] {
  const totalWeeks = Math.max(0, Math.floor(daysBetween(startDate, testDate) / 7));
  if (totalWeeks === 0) return [];

  const taperWeeks = Math.min(config.taperWeeks, totalWeeks);
  const afterTaper = totalWeeks - taperWeeks;
  const consolidationWeeks = Math.min(config.consolidationWeeks, afterTaper);
  const afterConsolidation = afterTaper - consolidationWeeks;
  const diagnosticWeeks = Math.min(config.diagnosticWeeks, afterConsolidation);
  const correctionWeeks = afterConsolidation - diagnosticWeeks;

  const focusDomains = priorities.slice(0, config.focusDomainsPerWeek).map((p) => p.domain);
  const diagnosticEnd = diagnosticWeeks;
  const correctionEnd = diagnosticEnd + correctionWeeks;
  const consolidationEnd = correctionEnd + consolidationWeeks;

  const weeks: SatPrepWeek[] = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weekNumber = i + 1;
    const weekStart = addDays(startDate, i * 7);
    const weekEnd = addDays(weekStart, 6);

    let phase: SatPrepPhase;
    if (weekNumber <= diagnosticEnd) phase = 'DIAGNOSTIC';
    else if (weekNumber <= correctionEnd) phase = 'CORRECTION';
    else if (weekNumber <= consolidationEnd) phase = 'CONSOLIDATION';
    else phase = 'TAPER';

    const correctionIndex = weekNumber - diagnosticEnd; // 1-based within correction phase
    const fullPracticeTest =
      (phase === 'DIAGNOSTIC' && weekNumber === diagnosticEnd && diagnosticWeeks > 0) ||
      phase === 'CONSOLIDATION' ||
      (phase === 'CORRECTION' && correctionIndex % config.practiceTestIntervalWeeks === 0);

    weeks.push({
      weekNumber,
      startDate: weekStart,
      endDate: weekEnd,
      phase,
      focusDomains: phase === 'TAPER' ? [] : focusDomains,
      fullPracticeTest,
    });
  }

  return weeks;
}
