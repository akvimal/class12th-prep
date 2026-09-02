# TASK-003 - Curriculum and Provenance Model

## Objective

Implement versioned curriculum hierarchy and academic weight provenance.

## Dependencies

TASK-002.

## In Scope

CurriculumVersion, Subject, Unit, Chapter, Topic, AcademicWeight and provenance/source types. Read APIs/repositories for hierarchy.

## Out of Scope

Real CBSE scraping/import automation, student progress, planner.

## Business / Architecture Rules

Curriculum is master data and independent of student progress. Derived weight must never be stored as OFFICIAL. Preserve curriculum version/source metadata.

## Automated Tests

- Create two curriculum versions without collision.
- Hierarchy retrieval returns deterministic order.
- AcademicWeight accepts OFFICIAL/DERIVED_SQP/DERIVED_PYQ/SCHOOL_TEACHER/USER.
- OFFICIAL record validation requires source reference.

## Acceptance Criteria

- Synthetic curriculum can be loaded.
- API/repository can retrieve subject -> unit -> chapter -> topic.
- Provenance is visible in returned data.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
