/**
 * Study-session evidence (docs/DOMAIN_MODEL.md `StudySession`, TASK-008).
 *
 * A session is an immutable record of work that actually happened. Recording
 * one never changes chapter state — partial work is not silently promoted to a
 * completed chapter (that is the readiness engine's job, TASK-009).
 */

export const STUDY_SESSION_TYPES = [
  'LEARN',
  'PRACTISE',
  'ACTIVE_RECALL',
  'REVISION',
  'PYQ',
  'CHAPTER_TEST',
  'UNIT_TEST',
  'SAMPLE_PAPER',
  'FULL_PAPER',
  'ERROR_CORRECTION',
  'SCHOOL_HOMEWORK',
] as const;
export type StudySessionType = (typeof STUDY_SESSION_TYPES)[number];

/**
 * Session types that are retrieval / testing practice, i.e. a "revision" for
 * the readiness recency factor (days since last revision). First-exposure and
 * drill work (`LEARN`, `PRACTISE`, `ERROR_CORRECTION`, `SCHOOL_HOMEWORK`) is
 * study but not revision.
 */
export const REVISION_SESSION_TYPES: readonly StudySessionType[] = [
  'ACTIVE_RECALL',
  'REVISION',
  'PYQ',
  'CHAPTER_TEST',
  'UNIT_TEST',
  'SAMPLE_PAPER',
  'FULL_PAPER',
];

export function isRevisionSession(type: StudySessionType): boolean {
  return REVISION_SESSION_TYPES.includes(type);
}

export const SESSION_COMPLETIONS = ['YES', 'PARTIAL', 'NO'] as const;
export type SessionCompletion = (typeof SESSION_COMPLETIONS)[number];

export interface SessionNumbers {
  actualMinutes: number;
  plannedMinutes?: number | null;
  attempted?: number | null;
  correct?: number | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface SessionViolation {
  field: keyof SessionNumbers;
  message: string;
}

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateSession(input: SessionNumbers): SessionViolation[] {
  const v: SessionViolation[] = [];

  if (!isNonNegativeInt(input.actualMinutes)) {
    v.push({ field: 'actualMinutes', message: 'actual minutes must be a non-negative integer' });
  }
  if (input.plannedMinutes != null && !isNonNegativeInt(input.plannedMinutes)) {
    v.push({ field: 'plannedMinutes', message: 'planned minutes must be a non-negative integer' });
  }
  if (input.attempted != null && !isNonNegativeInt(input.attempted)) {
    v.push({ field: 'attempted', message: 'attempted must be a non-negative integer' });
  }
  if (input.correct != null) {
    if (!isNonNegativeInt(input.correct)) {
      v.push({ field: 'correct', message: 'correct must be a non-negative integer' });
    } else if (input.attempted != null && input.correct > input.attempted) {
      v.push({ field: 'correct', message: 'correct cannot exceed attempted' });
    }
  }
  if (input.startedAt && input.endedAt && input.endedAt < input.startedAt) {
    v.push({ field: 'endedAt', message: 'ended_at cannot be before started_at' });
  }

  return v;
}

export class StudySessionError extends Error {
  readonly violations: SessionViolation[];
  constructor(violations: SessionViolation[]) {
    super(`invalid study session: ${violations.map((x) => x.message).join('; ')}`);
    this.name = 'StudySessionError';
    this.violations = violations;
  }
}

export function assertSession(input: SessionNumbers): void {
  const violations = validateSession(input);
  if (violations.length > 0) throw new StudySessionError(violations);
}
