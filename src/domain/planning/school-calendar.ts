import type { SchoolCalendarConfig } from '@/config/school-calendar';
import { dayOfWeek, eachDay } from './dates';

/**
 * School calendar events and the deterministic daily-capacity calculation
 * (docs/SRS.md §8). Pure — no I/O, no timezone: the caller resolves "today" in
 * the student's timezone and passes an ISO date.
 *
 * The calendar changes available capacity; it never creates study tasks.
 */

export const SCHOOL_EVENT_TYPES = [
  'NORMAL_SCHOOL_DAY',
  'HOLIDAY',
  'STUDY_LEAVE',
  'EXAM_DAY',
  'PRACTICAL_DAY',
  'VACATION',
  'UNAVAILABLE',
] as const;
export type SchoolEventType = (typeof SCHOOL_EVENT_TYPES)[number];

export interface CalendarEvent {
  id: string;
  type: SchoolEventType;
  startDate: string;
  endDate: string;
  capacityOverride: number | null;
}

export interface DailyCapacityInput {
  date: string;
  weekdayCapacityMinutes: number;
  weekendCapacityMinutes: number;
  events: CalendarEvent[];
}

export interface DailyCapacity {
  date: string;
  minutes: number;
  /** What set the number: the day-of-week rule, or the winning event's type. */
  basis: 'WEEKDAY' | 'WEEKEND' | SchoolEventType;
  appliedEventId: string | null;
}

function baseCapacity(input: DailyCapacityInput, config: SchoolCalendarConfig): DailyCapacity {
  const weekend = config.weekendDays.includes(dayOfWeek(input.date));
  return {
    date: input.date,
    minutes: weekend ? input.weekendCapacityMinutes : input.weekdayCapacityMinutes,
    basis: weekend ? 'WEEKEND' : 'WEEKDAY',
    appliedEventId: null,
  };
}

function eventMinutes(
  event: CalendarEvent,
  input: DailyCapacityInput,
  config: SchoolCalendarConfig,
): number {
  if (event.capacityOverride !== null) return event.capacityOverride;
  const rule = config.eventCapacity[event.type];
  if (rule === 'weekday') return input.weekdayCapacityMinutes;
  if (rule === 'weekend') return input.weekendCapacityMinutes;
  return rule.minutes;
}

/** Deterministic tie-break so the same inputs always pick the same event. */
function pickWinner(events: CalendarEvent[], config: SchoolCalendarConfig): CalendarEvent {
  return [...events].sort((a, b) => {
    const priority = config.eventPriority[b.type] - config.eventPriority[a.type];
    if (priority !== 0) return priority;
    const explicit = Number(b.capacityOverride !== null) - Number(a.capacityOverride !== null);
    if (explicit !== 0) return explicit;
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  })[0]!;
}

export function resolveDailyCapacity(
  input: DailyCapacityInput,
  config: SchoolCalendarConfig,
): DailyCapacity {
  const covering = input.events.filter((e) => e.startDate <= input.date && input.date <= e.endDate);
  if (covering.length === 0) return baseCapacity(input, config);

  const winner = pickWinner(covering, config);
  return {
    date: input.date,
    minutes: Math.max(0, eventMinutes(winner, input, config)),
    basis: winner.type,
    appliedEventId: winner.id,
  };
}

export function resolveCapacityRange(
  input: Omit<DailyCapacityInput, 'date'> & { from: string; to: string },
  config: SchoolCalendarConfig,
): DailyCapacity[] {
  return eachDay(input.from, input.to).map((date) =>
    resolveDailyCapacity({ ...input, date }, config),
  );
}
