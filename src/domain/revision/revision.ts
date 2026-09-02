import { revisionV1, type RevisionConfig } from '@/config/revision';
import { addDays } from '@/domain/planning/dates';

/**
 * Deterministic spaced-revision schedule (docs/ALGORITHMS.md §7). Given where a
 * chapter is in its revision sequence and the outcome of the revision just
 * done, compute the next revision's number, method and due date. Same inputs +
 * config → same schedule.
 */

export const REVISION_OUTCOMES = ['STRONG', 'MODERATE', 'WEAK', 'FAILED'] as const;
export type RevisionOutcome = (typeof REVISION_OUTCOMES)[number];

/** Revision is activity-specific, never generic rereading (spec §7). */
export const REVISION_METHODS = [
  'ACTIVE_RECALL',
  'BLANK_PAGE',
  'PRACTISE',
  'PYQ',
  'FLASHCARDS',
] as const;
export type RevisionMethod = (typeof REVISION_METHODS)[number];

export const REVISION_STATUSES = ['SCHEDULED', 'DONE', 'MISSED', 'CANCELLED'] as const;
export type RevisionStatus = (typeof REVISION_STATUSES)[number];

export interface NextRevision {
  revisionNumber: number;
  intervalDays: number;
  dueDate: string;
  method: RevisionMethod;
}

function round(n: number): number {
  return Math.max(1, Math.round(n));
}

/** The base gap (days) before revision `n` (1-indexed), past the list the last value repeats. */
export function baseInterval(n: number, config: RevisionConfig = revisionV1): number {
  const idx = Math.max(0, Math.min(config.intervals.length - 1, n - 1));
  return config.intervals[idx]!;
}

function methodFor(revisionNumber: number, outcome: RevisionOutcome | null): RevisionMethod {
  if (outcome === 'FAILED' || outcome === 'WEAK') return 'PRACTISE';
  if (revisionNumber <= 1) return 'ACTIVE_RECALL';
  if (revisionNumber === 2) return 'BLANK_PAGE';
  return 'PYQ';
}

/**
 * The first revision after a chapter is learned: revision 1, due
 * `learnedOn + intervals[0]`.
 */
export function firstRevision(
  learnedOn: string,
  config: RevisionConfig = revisionV1,
): NextRevision {
  const intervalDays = baseInterval(1, config);
  return {
    revisionNumber: 1,
    intervalDays,
    dueDate: addDays(learnedOn, intervalDays),
    method: methodFor(1, null),
  };
}

/**
 * The next revision after completing revision `currentNumber` on `doneOn` with
 * the given outcome.
 */
export function nextRevision(
  currentNumber: number,
  outcome: RevisionOutcome,
  doneOn: string,
  config: RevisionConfig = revisionV1,
): NextRevision {
  if (outcome === 'FAILED') {
    return {
      revisionNumber: 1, // relearn from the start
      intervalDays: config.relearnRetestDays,
      dueDate: addDays(doneOn, config.relearnRetestDays),
      method: 'PRACTISE',
    };
  }

  const revisionNumber = currentNumber + 1;
  const base = baseInterval(revisionNumber, config);
  const factor =
    outcome === 'STRONG' ? config.extendFactor : outcome === 'WEAK' ? config.shortenFactor : 1;
  const intervalDays = Math.min(config.maxIntervalDays, round(base * factor));

  return {
    revisionNumber,
    intervalDays,
    dueDate: addDays(doneOn, intervalDays),
    method: methodFor(revisionNumber, outcome),
  };
}

/** Whether a scheduled revision is due (or overdue) on `asOf`. */
export function revisionDueState(dueDate: string, asOf: string): 'NONE' | 'DUE_TODAY' | 'OVERDUE' {
  if (asOf < dueDate) return 'NONE';
  if (asOf === dueDate) return 'DUE_TODAY';
  return 'OVERDUE';
}
