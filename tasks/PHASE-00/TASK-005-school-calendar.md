# TASK-005 - School Calendar and Capacity Overrides

## Objective

Model school days, holidays, study leave, exam/practical days and unavailable dates so future planning can calculate usable capacity.

## Dependencies

TASK-004.

## In Scope

SchoolCalendarEvent CRUD/read, event types, capacity override behavior, timezone-aware date handling.

## Out of Scope

Assessment content/marks, automatic daily planner.

## Business / Architecture Rules

Calendar changes available capacity but does not itself create study tasks. Use student's timezone. Avoid hardcoded weekday assumptions beyond configurable defaults.

## Automated Tests

- Normal weekday uses configured weekday capacity.
- Weekend uses weekend capacity.
- Holiday can use configured override/default.
- Unavailable day produces zero capacity.
- Overlapping events resolve by documented precedence.

## Acceptance Criteria

- Calendar API works.
- Capacity service returns deterministic daily available minutes for fixtures.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
