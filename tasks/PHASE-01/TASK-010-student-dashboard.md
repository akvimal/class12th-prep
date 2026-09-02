# TASK-010 - Student Dashboard Skeleton

## Objective

Build the minimal mobile-first dashboard using currently available progress/readiness data.

## Dependencies

TASK-007 through TASK-009.

## In Scope

Overall/subject readiness placeholders/calculations, target dates/days remaining, basic subject list, needs-attention list. Today cards may remain empty/manual until planner phase.

## Out of Scope

Smart planner, Study Now, parent dashboard, notifications.

## Business / Architecture Rules

Keep visual density low. Do not add gamification. Make later Today/Study Now insertion straightforward.

## Automated Tests

- Responsive UI smoke/E2E test.
- Empty state.
- Multiple subjects.
- Attention list ordering deterministic.

## Acceptance Criteria

- Dashboard is usable on mobile and desktop.
- No more data is shown than currently supported by evidence.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
