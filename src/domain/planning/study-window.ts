import { dayOfWeek } from './dates';

/**
 * Recurring study windows (docs/SRS.md §14 Phase 2, `StudyWindow`). A window is
 * a time range the student intends to study on certain days. Windows drive the
 * reminder schedule and the adherence metric; they never create tasks.
 */

export const STUDY_WINDOW_DAY_TYPES = ['WEEKDAY', 'WEEKEND', 'DAILY'] as const;
export type StudyWindowDayType = (typeof STUDY_WINDOW_DAY_TYPES)[number];

export interface StudyWindowShape {
  dayType: StudyWindowDayType;
  /** "HH:MM" 24h, local to the student's timezone. */
  startTime: string;
  endTime: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface StudyWindowViolation {
  field: 'dayType' | 'startTime' | 'endTime';
  message: string;
}

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function windowMinutes(w: StudyWindowShape): number {
  return minutesOfDay(w.endTime) - minutesOfDay(w.startTime);
}

export function validateStudyWindow(w: StudyWindowShape): StudyWindowViolation[] {
  const v: StudyWindowViolation[] = [];
  if (!STUDY_WINDOW_DAY_TYPES.includes(w.dayType)) {
    v.push({ field: 'dayType', message: `unknown day type "${w.dayType}"` });
  }
  if (!HHMM.test(w.startTime)) v.push({ field: 'startTime', message: 'startTime must be HH:MM' });
  if (!HHMM.test(w.endTime)) v.push({ field: 'endTime', message: 'endTime must be HH:MM' });
  if (HHMM.test(w.startTime) && HHMM.test(w.endTime) && windowMinutes(w) <= 0) {
    v.push({ field: 'endTime', message: 'endTime must be after startTime' });
  }
  return v;
}

export class StudyWindowError extends Error {
  readonly violations: StudyWindowViolation[];
  constructor(violations: StudyWindowViolation[]) {
    super(`invalid study window: ${violations.map((x) => x.message).join('; ')}`);
    this.name = 'StudyWindowError';
    this.violations = violations;
  }
}

export function assertStudyWindow(w: StudyWindowShape): void {
  const violations = validateStudyWindow(w);
  if (violations.length > 0) throw new StudyWindowError(violations);
}

export function isWeekend(isoDate: string): boolean {
  const d = dayOfWeek(isoDate);
  return d === 0 || d === 6;
}

/** Whether a window's recurrence includes the given calendar date. */
export function windowAppliesOn(dayType: StudyWindowDayType, isoDate: string): boolean {
  if (dayType === 'DAILY') return true;
  return dayType === 'WEEKEND' ? isWeekend(isoDate) : !isWeekend(isoDate);
}

/** Total intended study minutes across the enabled windows that apply on a date. */
export function plannedMinutesOn(
  windows: ReadonlyArray<StudyWindowShape & { enabled: boolean }>,
  isoDate: string,
): number {
  return windows
    .filter((w) => w.enabled && windowAppliesOn(w.dayType, isoDate))
    .reduce((sum, w) => sum + Math.max(0, windowMinutes(w)), 0);
}
