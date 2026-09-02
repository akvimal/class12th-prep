import { schoolCalendarV1 } from '@/config/school-calendar';
import {
  resolveCapacityRange,
  resolveDailyCapacity,
  type DailyCapacity,
} from '@/domain/planning/school-calendar';
import type {
  CalendarEventRecord,
  CalendarEventUpdate,
  NewCalendarEvent,
  Repositories,
} from '@/persistence/ports';

type WithCalendar = Pick<Repositories, 'schoolCalendar' | 'planning'>;

export function addCalendarEvent(
  repos: WithCalendar,
  event: NewCalendarEvent,
): Promise<{ id: string }> {
  return repos.schoolCalendar.addEvent(event);
}

export function updateCalendarEvent(
  repos: WithCalendar,
  eventId: string,
  patch: CalendarEventUpdate,
): Promise<CalendarEventRecord> {
  return repos.schoolCalendar.updateEvent(eventId, patch);
}

export function deleteCalendarEvent(repos: WithCalendar, eventId: string): Promise<void> {
  return repos.schoolCalendar.deleteEvent(eventId);
}

export function listCalendarEvents(
  repos: WithCalendar,
  academicYearId: string,
  range?: { from?: string; to?: string },
): Promise<CalendarEventRecord[]> {
  return repos.schoolCalendar.listEvents(academicYearId, range);
}

/** Usable study minutes for one date of a plan. Null if the plan does not exist. */
export async function getDailyCapacity(
  repos: WithCalendar,
  planId: string,
  date: string,
): Promise<DailyCapacity | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;
  const events = await repos.schoolCalendar.eventsForCapacity(plan.academicYearId, date, date);
  return resolveDailyCapacity(
    {
      date,
      weekdayCapacityMinutes: plan.weekdayCapacityMinutes,
      weekendCapacityMinutes: plan.weekendCapacityMinutes,
      events,
    },
    schoolCalendarV1,
  );
}

export interface CapacityRange {
  from: string;
  to: string;
  totalMinutes: number;
  days: DailyCapacity[];
}

/**
 * Usable study minutes for every day in [from, to] (defaults to the plan's
 * own window). Null if the plan does not exist.
 */
export async function getCapacityRange(
  repos: WithCalendar,
  planId: string,
  from?: string,
  to?: string,
): Promise<CapacityRange | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;

  const start = from ?? plan.startDate;
  const end = to ?? plan.examWindowEnd;
  const events = await repos.schoolCalendar.eventsForCapacity(plan.academicYearId, start, end);

  const days = resolveCapacityRange(
    {
      from: start,
      to: end,
      weekdayCapacityMinutes: plan.weekdayCapacityMinutes,
      weekendCapacityMinutes: plan.weekendCapacityMinutes,
      events,
    },
    schoolCalendarV1,
  );

  return {
    from: start,
    to: end,
    totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
    days,
  };
}
