# TASK-006 - Synthetic Validation Seed

## Objective

Create repeatable development/test seed data representing the SRS scenarios.

## Dependencies

TASK-003 through TASK-005.

## In Scope

Seed family/student, current preparation plan, synthetic Physics/Chemistry/Mathematics/Computer Science curriculum, chapter derived weights/readiness placeholders, school status placeholders where schema exists, and upcoming synthetic assessments as fixtures/files where assessment schema is not yet implemented.

## Out of Scope

Official CBSE chapter weightage or live curriculum import.

## Business / Architecture Rules

All seed academic weights must be clearly marked synthetic/TEST_DATA and never presented as official.

## Automated Tests

- Seed is idempotent or resettable.
- IDs/lookup keys are stable enough for regression tests.
- Synthetic data file validates against its schema/expected shape.

## Acceptance Criteria

- Developer can load the fixture in one command.
- Test suite can reuse the same fixture.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
