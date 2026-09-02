# TASK-011 - Manual Today and Session Flow

## Objective

Provide a temporary/manual Today workflow so the student can start using the app before the smart planner is implemented.

## Dependencies

TASK-008 and TASK-010.

## In Scope

Create up to three manual primary study tasks for a date, start/complete/partial flow, optional extra tasks, quick confidence/question outcome.

## Out of Scope

Automatic priority generation, school-test-driven planner.

## Business / Architecture Rules

Maximum three primary tasks. Missed tasks are not automatically copied to tomorrow in this phase.

## Automated Tests

- Cannot create >3 primary tasks without explicit optional flag.
- Complete and partial flows create session evidence.
- Mobile E2E happy path.

## Acceptance Criteria

- Student can use Dashboard -> Today -> task -> quick completion end to end.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
