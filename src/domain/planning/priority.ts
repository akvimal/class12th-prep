import type { PriorityConfig } from '@/config/priority';

/**
 * Deterministic candidate priority scoring (docs/ALGORITHMS.md §3).
 *
 *   raw = weakness · revisionDue · schoolUrgency · importance · backlog
 *
 * `computePriority` scores one candidate; `prioritize` ranks a set and adds a
 * normalised 0–1 `score` (raw ÷ the set's max raw). Confidence is never an
 * input — objective readiness is (SRS §4). Same inputs + config → same output.
 */

export type RevisionDueState = 'NONE' | 'DUE_TODAY' | 'OVERDUE';

export interface PriorityInput {
  /** Effective readiness 0–100 (lower ⇒ weaker ⇒ higher priority). */
  effectiveReadiness: number;
  /** Curriculum weight (RELATIVE 1–10 estimate), or null when unweighted. */
  boardWeight: number | null;
  /** Days until the nearest school test covering this chapter; null if none. */
  daysUntilSchoolTest: number | null;
  /** Spaced-revision state for this chapter. */
  revisionDue: RevisionDueState;
  /** How many times this task was missed / left partial and requeued. */
  missedCount: number;
}

export interface PriorityFactors {
  weakness: number;
  revisionDue: number;
  schoolUrgency: number;
  importance: number;
  backlog: number;
}

export interface PriorityResult {
  raw: number;
  factors: PriorityFactors;
  algorithmVersion: string;
}

export interface RankedCandidate<T> {
  candidate: T;
  priority: PriorityResult;
  /** raw ÷ max raw across the ranked set, 0–1. */
  score: number;
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function weaknessFactor(readiness: number, config: PriorityConfig): number {
  const r = Math.min(100, Math.max(0, readiness));
  const { atZeroReadiness, atFullReadiness } = config.weakness;
  return atFullReadiness + (atZeroReadiness - atFullReadiness) * (1 - r / 100);
}

function schoolUrgencyFactor(days: number | null, config: PriorityConfig): number {
  if (days === null || days < 0) return 1;
  for (const band of config.schoolUrgencyBands) {
    if (days <= band.maxDays) return band.factor;
  }
  return 1;
}

function importanceFactor(weight: number | null, config: PriorityConfig): number {
  const w = weight ?? config.importance.neutralWeight;
  return config.importance.base + config.importance.perWeightPoint * w;
}

function backlogFactor(missedCount: number, config: PriorityConfig): number {
  const bump = Math.min(config.backlog.max, config.backlog.perMiss * Math.max(0, missedCount));
  return 1 + bump;
}

function revisionFactor(state: RevisionDueState, config: PriorityConfig): number {
  if (state === 'OVERDUE') return config.revisionDue.overdue;
  if (state === 'DUE_TODAY') return config.revisionDue.dueToday;
  return config.revisionDue.none;
}

export function computePriority(input: PriorityInput, config: PriorityConfig): PriorityResult {
  const factors: PriorityFactors = {
    weakness: round4(weaknessFactor(input.effectiveReadiness, config)),
    revisionDue: revisionFactor(input.revisionDue, config),
    schoolUrgency: schoolUrgencyFactor(input.daysUntilSchoolTest, config),
    importance: round4(importanceFactor(input.boardWeight, config)),
    backlog: round4(backlogFactor(input.missedCount, config)),
  };
  const raw = round4(
    factors.weakness *
      factors.revisionDue *
      factors.schoolUrgency *
      factors.importance *
      factors.backlog,
  );
  return { raw, factors, algorithmVersion: config.version };
}

/**
 * Rank candidates by priority, highest first. `score` is the raw score divided
 * by the set's maximum, so it is comparable within one ranking only. Ties keep
 * the input order (stable) for determinism.
 */
export function prioritize<T>(
  candidates: ReadonlyArray<{ candidate: T; input: PriorityInput }>,
  config: PriorityConfig,
): RankedCandidate<T>[] {
  const scored = candidates.map(({ candidate, input }) => ({
    candidate,
    priority: computePriority(input, config),
  }));
  const maxRaw = scored.reduce((m, s) => Math.max(m, s.priority.raw), 0) || 1;
  return scored
    .map((s) => ({ ...s, score: round4(s.priority.raw / maxRaw) }))
    .sort((a, b) => b.priority.raw - a.priority.raw);
}
