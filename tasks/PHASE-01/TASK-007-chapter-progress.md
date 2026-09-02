# TASK-007 - Chapter Progress

## Objective

Add student-specific chapter preparation state, confidence, interest, school status and readiness-component storage.

## Dependencies

TASK-006.

## In Scope

ChapterProgress entity/API; state enums; confidence STRONG/MODERATE/WEAK; interest LIKE/NEUTRAL/DISLIKE; school status; component scores 0..100.

## Out of Scope

Readiness calculation engine, daily planner.

## Business / Architecture Rules

Progress is separate from curriculum. Validate score ranges. A progress record may move backward later when objective evidence arrives.

## Automated Tests

- CRUD/update tests.
- Score range validation.
- Two students can have independent progress for same curriculum chapter.
- Curriculum row remains unchanged.

## Acceptance Criteria

- Subject/chapter list can return student progress alongside curriculum data.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
