import type { VersionedConfig } from './index';

/**
 * SAT competitive-exam prep configuration. Turns two attempts' domain
 * performance bands into a priority order and a week-by-week phase plan,
 * the same way `priority-v1` / `plan-pressure-v1` turn board evidence into
 * scores — versioned so a reported priority/plan is reproducible.
 */
export interface SatPrepConfig extends VersionedConfig {
  /** Midpoint-of-band delta (points) at/above which a domain counts IMPROVED. */
  improvedDeltaThreshold: number;
  /** Midpoint-of-band delta (points) at/below which (negated) a domain counts REGRESSED. */
  regressedDeltaThreshold: number;
  /** Multiplier on (800 − latest band high) by trend — flat/regressed domains rank first. */
  trendWeight: { IMPROVED: number; FLAT: number; REGRESSED: number; NEW: number };
  /**
   * Multiplier on priority score by section — set above 1 for the section the
   * student has explicitly asked to prioritise (it has no bearing on the
   * per-domain evidence itself, only on which section's domains surface first
   * when time is split across both).
   */
  sectionWeight: { READING_WRITING: number; MATH: number };
  /** How many of the top-priority domains a diagnostic/correction week focuses on. */
  focusDomainsPerWeek: number;
  /** Target week counts for each phase; weeks actually available are clamped into these in order taper → consolidation → diagnostic → (remainder) correction. */
  taperWeeks: number;
  consolidationWeeks: number;
  diagnosticWeeks: number;
  /** A full-length timed practice test every N weeks once the correction phase starts. */
  practiceTestIntervalWeeks: number;
  /** Fallback weekly time budget (minutes) when a plan doesn't set one explicitly. */
  defaultWeeklyTargetMinutes: number;
}

export const satPrepV1: SatPrepConfig = {
  version: 'sat-prep-v1',
  improvedDeltaThreshold: 30,
  regressedDeltaThreshold: 30,
  trendWeight: { REGRESSED: 1.3, FLAT: 1.15, NEW: 1, IMPROVED: 0.7 },
  sectionWeight: { READING_WRITING: 1.2, MATH: 0.9 },
  focusDomainsPerWeek: 3,
  taperWeeks: 1,
  consolidationWeeks: 2,
  diagnosticWeeks: 3,
  practiceTestIntervalWeeks: 2,
  defaultWeeklyTargetMinutes: 420,
};
