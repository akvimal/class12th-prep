# TASK-002 - Core Database Schema

## Objective

Create the foundational tenant/student/academic-year/preparation-plan schema and migration infrastructure.

## Dependencies

TASK-001.

## In Scope

Entities: Family, Student, AcademicYear, PreparationPlan, PlanPhase. Add IDs, timestamps, ownership FKs and plan-date fields. Enforce one active primary plan per academic year using an appropriate database/application invariant.

## Out of Scope

Curriculum hierarchy, assessments, sessions, readiness calculations.

## Business / Architecture Rules

Dates are configurable. No month-specific columns. Student and PreparationPlan are separate. Schema must be product-ready for multiple students/families.

## Automated Tests

- Migration up/down or equivalent.
- FK/ownership tests.
- Invalid plan date ordering validation.
- Multiple students can coexist.
- Historical/inactive plan can coexist with active plan.

## Acceptance Criteria

- Schema matches `DOMAIN_MODEL.md`.
- Migration works on empty database.
- Seed smoke test can create a family, student, academic year and plan.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
