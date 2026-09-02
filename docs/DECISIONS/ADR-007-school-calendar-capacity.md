# ADR-007: School calendar and daily capacity

**Status:** Accepted (TASK-005)

## Decision

`school_calendar_events` records school days, holidays, study leave, exam and
practical days, vacations and unavailable dates for an academic year. A pure
function (`src/domain/planning/school-calendar.ts`) turns a date + the plan's
weekday/weekend capacity + the covering events into **usable study minutes**.

The calendar **changes capacity only** — it never creates study tasks.

### Resolution rules (config `school-calendar-v1`)

1. No event covers the date → weekday or weekend capacity by day of week
   (`weekendDays: [0, 6]`, Sunday/Saturday — configurable).
2. One or more events cover the date → the highest-priority event wins:

   | Priority | Type | Default capacity |
   |---|---|---|
   | 100 | UNAVAILABLE | 0 |
   | 90 | EXAM_DAY | 45 min |
   | 80 | PRACTICAL_DAY | 60 min |
   | 70 | STUDY_LEAVE | weekend capacity |
   | 60 | NORMAL_SCHOOL_DAY | weekday capacity |
   | 40 | VACATION | weekend capacity |
   | 30 | HOLIDAY | weekend capacity |

3. `capacityOverride` (minutes) on an event beats the type default.
4. Same-type tie-break, for determinism: explicit override first, then earliest
   `startDate`, then id.

`NORMAL_SCHOOL_DAY` is how a "working Saturday" is modelled — it forces weekday
capacity on a day the day-of-week rule would call a weekend.

## Why

- Deterministic: the same date + events + config always yields the same
  minutes, so scheduler/planner regression tests are stable (docs/TEST_STRATEGY.md).
- Priority-based conflict resolution keeps the model predictable when a user
  enters overlapping ranges (e.g. an EXAM_DAY inside a STUDY_LEAVE span → the
  exam's lower capacity wins).
- Timezone handling stays at the edge: `currentDateInZone(tz, instant)` resolves
  "today" in the student's timezone; the engine only ever sees ISO date strings.

## Consequences

- Capacity is read through `getDailyCapacity` / `getCapacityRange`
  (`src/app-services/calendar.ts`), which combine the plan's capacity numbers
  with the year's events.
- The daily planner (Phase 2) consumes these minutes as its budget; it must
  never schedule more than this without an explicit user capacity override.
