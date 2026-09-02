/**
 * Assessment vocabulary and validation (docs/DOMAIN_MODEL.md `Assessment`).
 * Phase 2 is announce-only — an Assessment records that a test is scheduled and
 * which chapters it covers. Results are a later phase.
 */

export const ASSESSMENT_TYPES = [
  'SCHOOL_CLASS_TEST',
  'SCHOOL_UNIT_TEST',
  'SCHOOL_HALF_YEARLY',
  'PREBOARD',
  'SELF_TEST',
  'PYQ',
  'SAMPLE_PAPER',
  'FULL_MOCK',
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_STATUSES = ['ANNOUNCED', 'COMPLETED', 'CANCELLED'] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

/** School-set tests carry more planning urgency than self-practice. */
export const SCHOOL_ASSESSMENT_TYPES: readonly AssessmentType[] = [
  'SCHOOL_CLASS_TEST',
  'SCHOOL_UNIT_TEST',
  'SCHOOL_HALF_YEARLY',
  'PREBOARD',
];

export function isSchoolAssessment(type: AssessmentType): boolean {
  return SCHOOL_ASSESSMENT_TYPES.includes(type);
}

export interface AssessmentDraft {
  type: AssessmentType;
  name: string;
  examDate: string;
  maxMarks?: number | null;
  chapterKeys: string[];
}

export interface AssessmentViolation {
  field: 'type' | 'name' | 'examDate' | 'maxMarks' | 'chapterKeys';
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateAssessmentDraft(draft: AssessmentDraft): AssessmentViolation[] {
  const v: AssessmentViolation[] = [];
  if (!ASSESSMENT_TYPES.includes(draft.type)) {
    v.push({ field: 'type', message: `unknown assessment type "${draft.type}"` });
  }
  if (!draft.name.trim()) {
    v.push({ field: 'name', message: 'name is required' });
  }
  if (!ISO_DATE.test(draft.examDate)) {
    v.push({ field: 'examDate', message: 'examDate must be YYYY-MM-DD' });
  }
  if (draft.maxMarks != null && (!Number.isFinite(draft.maxMarks) || draft.maxMarks <= 0)) {
    v.push({ field: 'maxMarks', message: 'maxMarks must be a positive number' });
  }
  if (draft.chapterKeys.length === 0) {
    v.push({ field: 'chapterKeys', message: 'at least one chapter must be covered' });
  }
  return v;
}

export class AssessmentError extends Error {
  readonly violations: AssessmentViolation[];
  constructor(violations: AssessmentViolation[]) {
    super(`invalid assessment: ${violations.map((x) => x.message).join('; ')}`);
    this.name = 'AssessmentError';
    this.violations = violations;
  }
}

export function assertAssessmentDraft(draft: AssessmentDraft): void {
  const violations = validateAssessmentDraft(draft);
  if (violations.length > 0) throw new AssessmentError(violations);
}
