# TASK-008 - Study Session Evidence

## Objective

Record actual learning/practice/revision activity with minimal student input.

## Dependencies

TASK-007.

## In Scope

StudySession with types LEARN/PRACTISE/ACTIVE_RECALL/REVISION/PYQ/CHAPTER_TEST/UNIT_TEST/SAMPLE_PAPER/FULL_PAPER/ERROR_CORRECTION/SCHOOL_HOMEWORK; completion YES/PARTIAL/NO; planned/actual minutes; optional attempted/correct; confidence after.

## Out of Scope

Automatic scheduling/revision creation.

## Business / Architecture Rules

Sessions are historical evidence. Partial work must not be converted to completed chapter state automatically.

## Automated Tests

- Create completed/partial/no session.
- Optional question counts validated.
- Historical sessions remain queryable.
- Actual minutes cannot be negative.

## Acceptance Criteria

- Student can record a session in a compact API flow.
- Session history is available by date/subject/chapter.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
