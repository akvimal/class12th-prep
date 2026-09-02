import type { VersionedConfig } from './index';

/**
 * Weekly-review configuration. Versioned — a stored `WeeklyReview` records
 * which version generated it, so an old review still reads the way it was
 * produced (docs/DOMAIN_MODEL.md `WeeklyReview`).
 */
export interface ReviewConfig extends VersionedConfig {
  /** Days the review window covers, counting back from the review date. */
  weekLengthDays: number;
  /** How many chapters "Next week's focus" names. */
  focusChapterCount: number;
  /** Only chapters below this effective readiness are eligible for the focus list. */
  readinessFocusCeiling: number;
}

export const reviewV1: ReviewConfig = {
  version: 'review-v1',
  weekLengthDays: 7,
  focusChapterCount: 3,
  readinessFocusCeiling: 55,
};
