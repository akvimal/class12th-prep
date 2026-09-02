import type { VersionedConfig } from './index';

/**
 * Repeated-error detection configuration (docs/SRS.md §12). Versioned so a
 * flagged pattern is reproducible.
 */
export interface ErrorPatternsConfig extends VersionedConfig {
  /** Same error type in the same chapter this many times → a chapter-level pattern. */
  minChapterOccurrences: number;
  /** Same error type across a subject (≥ 2 chapters) this many times → a subject-level pattern. */
  minSubjectOccurrences: number;
  /** Ignore a pattern whose total marks lost is below this. */
  minMarksLost: number;
}

export const errorPatternsV1: ErrorPatternsConfig = {
  version: 'error-patterns-v1',
  minChapterOccurrences: 2,
  minSubjectOccurrences: 3,
  minMarksLost: 4,
};
