import type { VersionedConfig } from './index';

/**
 * Spaced-revision configuration (docs/ALGORITHMS.md §7). Versioned — a
 * RevisionSchedule row records which version produced its due date.
 *
 *   base intervals   1, 3, 7, 14, 30 days (then the last, capped)
 *   STRONG  → next interval × extendFactor   (and advance the revision number)
 *   MODERATE→ next interval as-is            (advance)
 *   WEAK    → next interval × shortenFactor  (advance, plus targeted practice)
 *   FAILED  → relearn: reset to revision 1, retest in `relearnRetestDays`
 */
export interface RevisionConfig extends VersionedConfig {
  /** Days from the previous revision to the nth (1-indexed). Past the list, the last value is reused. */
  intervals: number[];
  extendFactor: number;
  shortenFactor: number;
  relearnRetestDays: number;
  /** Hard cap on any computed interval. */
  maxIntervalDays: number;
}

export const revisionV1: RevisionConfig = {
  version: 'revision-v1',
  intervals: [1, 3, 7, 14, 30],
  extendFactor: 1.5,
  shortenFactor: 0.5,
  relearnRetestDays: 1,
  maxIntervalDays: 45,
};
