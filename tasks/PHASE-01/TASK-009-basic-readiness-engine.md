# TASK-009 - Basic Readiness Engine

## Objective

Implement deterministic raw/effective readiness calculation and immutable snapshots using versioned configuration.

## Dependencies

TASK-007 and TASK-008.

## In Scope

Readiness configuration v1, weighted component formula, recency factor, ReadinessSnapshot, calculation service.

## Out of Scope

Assessment-specific evidence weighting, projected marks.

## Business / Architecture Rules

Readiness stays 0..100. Confidence does not override test evidence. Every snapshot stores algorithm/config version.

## Automated Tests

- Formula fixture tests.
- Recency boundary tests.
- 0/100 bounds.
- Same input/config/date -> same result.
- Snapshot history preserved.

## Acceptance Criteria

- Chapter readiness can be calculated/recalculated.
- No historical snapshot is overwritten.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
