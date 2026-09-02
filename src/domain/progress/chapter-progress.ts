/**
 * Student-specific chapter progress vocabulary and score validation
 * (docs/DOMAIN_MODEL.md `ChapterProgress`, docs/SRS.md §7).
 *
 * Progress is entirely separate from the curriculum master data. A progress
 * record may move backward to an earlier state when strong contradictory
 * evidence arrives — this module does not enforce a forward-only machine.
 */

export const CHAPTER_STATES = [
  'NOT_STARTED',
  'LEARNING',
  'LEARNED',
  'PRACTISED',
  'TESTED',
  'REVISED',
  'EXAM_READY',
] as const;
export type ChapterState = (typeof CHAPTER_STATES)[number];

export const CONFIDENCE_LEVELS = ['WEAK', 'MODERATE', 'STRONG'] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const INTEREST_LEVELS = ['DISLIKE', 'NEUTRAL', 'LIKE'] as const;
export type InterestLevel = (typeof INTEREST_LEVELS)[number];

export const SCHOOL_CHAPTER_STATUSES = [
  'NOT_TAUGHT',
  'CURRENTLY_TEACHING',
  'COMPLETED',
  'REVISING',
] as const;
export type SchoolChapterStatus = (typeof SCHOOL_CHAPTER_STATUSES)[number];

export const COMPONENT_SCORE_KEYS = [
  'conceptScore',
  'practiceScore',
  'testScore',
  'recallScore',
  'revisionScore',
] as const;
export type ComponentScoreKey = (typeof COMPONENT_SCORE_KEYS)[number];

export type ComponentScores = Record<ComponentScoreKey, number>;

export interface ScoreViolation {
  field: ComponentScoreKey | 'effectiveReadiness';
  message: string;
}

function inRange(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

/** Every component score must be an integer 0..100. */
export function validateComponentScores(scores: Partial<ComponentScores>): ScoreViolation[] {
  const violations: ScoreViolation[] = [];
  for (const key of COMPONENT_SCORE_KEYS) {
    const value = scores[key];
    if (value !== undefined && !inRange(value)) {
      violations.push({ field: key, message: `${key} must be an integer between 0 and 100` });
    }
  }
  return violations;
}

export class ChapterProgressError extends Error {
  readonly violations: ScoreViolation[];
  constructor(violations: ScoreViolation[]) {
    super(`invalid chapter progress: ${violations.map((v) => v.message).join('; ')}`);
    this.name = 'ChapterProgressError';
    this.violations = violations;
  }
}

export function assertComponentScores(scores: Partial<ComponentScores>): void {
  const violations = validateComponentScores(scores);
  if (violations.length > 0) throw new ChapterProgressError(violations);
}
