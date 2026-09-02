/**
 * Question-error vocabulary and state machine (docs/SRS.md §11,
 * docs/DOMAIN_MODEL.md). An error is a specific mistake in an assessment; a
 * correction alone cannot reach MASTERED without a passed retest.
 */

export const ERROR_TYPES = [
  'CONCEPT',
  'FORMULA_RECALL',
  'MEMORY',
  'CALCULATION',
  'MISREAD_QUESTION',
  'WRONG_METHOD',
  'INCOMPLETE_STEPS',
  'PRESENTATION',
  'TIME_MANAGEMENT',
  'CARELESS',
  'UNKNOWN',
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_STATES = ['NEW', 'REVIEWED', 'CORRECTED', 'RETEST_DUE', 'MASTERED'] as const;
export type ErrorState = (typeof ERROR_STATES)[number];

export const ERROR_TRANSITIONS = [
  'REVIEW',
  'CORRECT',
  'SCHEDULE_RETEST',
  'PASS_RETEST',
  'FAIL_RETEST',
] as const;
export type ErrorTransition = (typeof ERROR_TRANSITIONS)[number];

const MACHINE: Record<ErrorState, Partial<Record<ErrorTransition, ErrorState>>> = {
  NEW: { REVIEW: 'REVIEWED' },
  REVIEWED: { CORRECT: 'CORRECTED' },
  CORRECTED: { SCHEDULE_RETEST: 'RETEST_DUE' },
  RETEST_DUE: { PASS_RETEST: 'MASTERED', FAIL_RETEST: 'CORRECTED' },
  MASTERED: {},
};

export function canAdvanceError(state: ErrorState, transition: ErrorTransition): boolean {
  return MACHINE[state][transition] !== undefined;
}

export class ErrorTransitionError extends Error {
  constructor(state: ErrorState, transition: ErrorTransition) {
    super(`cannot apply "${transition}" to an error in state "${state}"`);
    this.name = 'ErrorTransitionError';
  }
}

/** The next state, or throw if the transition is not allowed from `state`. */
export function advanceErrorState(state: ErrorState, transition: ErrorTransition): ErrorState {
  const next = MACHINE[state][transition];
  if (next === undefined) throw new ErrorTransitionError(state, transition);
  return next;
}

export interface QuestionErrorDraft {
  chapterKey: string;
  errorType: ErrorType;
  marksLost: number;
  notes?: string | null;
}

/** Error types that point at a knowledge gap (vs. exam-technique slips). */
export const KNOWLEDGE_GAP_ERROR_TYPES: readonly ErrorType[] = [
  'CONCEPT',
  'FORMULA_RECALL',
  'MEMORY',
  'WRONG_METHOD',
  'INCOMPLETE_STEPS',
];

export function isKnowledgeGap(type: ErrorType): boolean {
  return KNOWLEDGE_GAP_ERROR_TYPES.includes(type);
}

export interface AssessmentResultDraft {
  score: number;
  maxMarks: number;
  timeTakenMinutes?: number | null;
  errors: QuestionErrorDraft[];
}

export interface ResultViolation {
  field: 'score' | 'maxMarks' | 'timeTakenMinutes' | 'errors';
  message: string;
}

export function validateAssessmentResult(draft: AssessmentResultDraft): ResultViolation[] {
  const v: ResultViolation[] = [];
  if (!Number.isInteger(draft.maxMarks) || draft.maxMarks <= 0) {
    v.push({ field: 'maxMarks', message: 'maxMarks must be a positive integer' });
  }
  if (!Number.isInteger(draft.score) || draft.score < 0 || draft.score > draft.maxMarks) {
    v.push({ field: 'score', message: 'score must be between 0 and maxMarks' });
  }
  if (draft.timeTakenMinutes != null && draft.timeTakenMinutes < 0) {
    v.push({ field: 'timeTakenMinutes', message: 'time cannot be negative' });
  }
  for (const e of draft.errors) {
    if (!Number.isInteger(e.marksLost) || e.marksLost <= 0) {
      v.push({
        field: 'errors',
        message: `marksLost for "${e.chapterKey}" must be a positive integer`,
      });
    }
    if (!ERROR_TYPES.includes(e.errorType)) {
      v.push({ field: 'errors', message: `unknown error type "${e.errorType}"` });
    }
  }
  const lost = draft.errors.reduce((s, e) => s + (e.marksLost > 0 ? e.marksLost : 0), 0);
  if (lost > draft.maxMarks - draft.score) {
    v.push({ field: 'errors', message: 'tagged marks lost exceed the marks dropped' });
  }
  return v;
}

export class AssessmentResultError extends Error {
  readonly violations: ResultViolation[];
  constructor(violations: ResultViolation[]) {
    super(`invalid assessment result: ${violations.map((x) => x.message).join('; ')}`);
    this.name = 'AssessmentResultError';
    this.violations = violations;
  }
}

export function assertAssessmentResult(draft: AssessmentResultDraft): void {
  const violations = validateAssessmentResult(draft);
  if (violations.length > 0) throw new AssessmentResultError(violations);
}
