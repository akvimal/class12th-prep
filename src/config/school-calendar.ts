import type { VersionedConfig } from './index';
import type { SchoolEventType } from '@/domain/planning/school-calendar';

/**
 * How the school calendar affects daily study capacity (docs/SRS.md §8,
 * docs/ARCHITECTURE.md). Versioned — nothing here is a hardcoded weekday
 * assumption or magic constant scattered through the engine.
 *
 * `weekendDays` uses JavaScript's day numbering: 0 = Sunday .. 6 = Saturday.
 *
 * `eventCapacity` says what an event of each type does to capacity when it has
 * no explicit `capacityOverride`:
 *   'weekday'  -> use the plan's weekday capacity
 *   'weekend'  -> use the plan's weekend capacity
 *   { minutes } -> a fixed number
 *
 * `eventPriority` breaks ties when several events cover one date — higher wins.
 */
export interface SchoolCalendarConfig extends VersionedConfig {
  weekendDays: number[];
  eventCapacity: Record<SchoolEventType, 'weekday' | 'weekend' | { minutes: number }>;
  eventPriority: Record<SchoolEventType, number>;
}

export const schoolCalendarV1: SchoolCalendarConfig = {
  version: 'school-calendar-v1',
  weekendDays: [0, 6],
  eventCapacity: {
    NORMAL_SCHOOL_DAY: 'weekday',
    HOLIDAY: 'weekend',
    STUDY_LEAVE: 'weekend',
    VACATION: 'weekend',
    PRACTICAL_DAY: { minutes: 60 },
    EXAM_DAY: { minutes: 45 },
    UNAVAILABLE: { minutes: 0 },
  },
  eventPriority: {
    UNAVAILABLE: 100,
    EXAM_DAY: 90,
    PRACTICAL_DAY: 80,
    STUDY_LEAVE: 70,
    NORMAL_SCHOOL_DAY: 60,
    VACATION: 40,
    HOLIDAY: 30,
  },
};
