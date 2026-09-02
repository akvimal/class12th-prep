/**
 * Preparation-plan date ordering (docs/DOMAIN_MODEL.md: "dates must be
 * logically ordered unless a documented custom phase configuration explicitly
 * permits otherwise").
 *
 * Pure and deterministic: dates are compared as ISO `YYYY-MM-DD` strings, so
 * there is no timezone or Date-parsing ambiguity. No calendar-month logic.
 */

export interface PlanDates {
  startDate: string;
  syllabusTargetDate: string;
  hardCompletionDate: string;
  revisionStartDate: string;
  examWindowStart: string;
  examWindowEnd: string;
}

export interface PlanDateViolation {
  field: keyof PlanDates;
  after: keyof PlanDates;
  message: string;
}

/** The plan dates, in the order they must occur. */
const DATE_FIELDS: readonly (keyof PlanDates)[] = [
  'startDate',
  'syllabusTargetDate',
  'hardCompletionDate',
  'revisionStartDate',
  'examWindowStart',
  'examWindowEnd',
];

/** Consecutive pairs that must be non-decreasing, in plan order. */
const CONSECUTIVE: ReadonlyArray<readonly [keyof PlanDates, keyof PlanDates]> = [
  ['startDate', 'syllabusTargetDate'],
  ['syllabusTargetDate', 'hardCompletionDate'],
  ['hardCompletionDate', 'revisionStartDate'],
  ['revisionStartDate', 'examWindowStart'],
  ['examWindowStart', 'examWindowEnd'],
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Only the six date fields are inspected — callers may pass a wider object
 * (e.g. a full plan-create payload) and its other fields are ignored.
 */
export function validatePlanDateOrder(dates: PlanDates): PlanDateViolation[] {
  const violations: PlanDateViolation[] = [];

  for (const field of DATE_FIELDS) {
    const value = dates[field];
    if (typeof value !== 'string' || !ISO_DATE.test(value)) {
      violations.push({ field, after: field, message: `${field} is not an ISO date: "${value}"` });
    }
  }
  if (violations.length > 0) return violations;

  for (const [earlier, later] of CONSECUTIVE) {
    if (dates[later] < dates[earlier]) {
      violations.push({
        field: later,
        after: earlier,
        message: `${later} (${dates[later]}) must not be before ${earlier} (${dates[earlier]})`,
      });
    }
  }
  return violations;
}

export class PlanDateOrderError extends Error {
  readonly violations: PlanDateViolation[];
  constructor(violations: PlanDateViolation[]) {
    super(
      `preparation plan dates are out of order: ${violations.map((v) => v.message).join('; ')}`,
    );
    this.name = 'PlanDateOrderError';
    this.violations = violations;
  }
}

export function assertPlanDateOrder(dates: PlanDates): void {
  const violations = validatePlanDateOrder(dates);
  if (violations.length > 0) throw new PlanDateOrderError(violations);
}
