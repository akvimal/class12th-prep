# TASK-004 - Student Academic Year and Preparation Plan

## Objective

Implement application/API operations to configure a student's academic year, subjects and arbitrary preparation dates/capacity.

## Dependencies

TASK-002 and TASK-003.

## In Scope

SubjectEnrollment; plan create/read/update; subject target marks and optional subject-specific board exam date; weekday/weekend capacity; semantic plan phase resolution.

## Out of Scope

Daily planner, readiness, parent UI.

## Business / Architecture Rules

Phase resolution uses configured dates only. Changing dates must not alter curriculum or historical evidence. Subject exam date may be null until timetable is known.

## Automated Tests

- Current short plan fixture.
- July-February plan.
- 90-day plan.
- Change target date and verify phase/trajectory inputs update.
- No test branches on month names.

## Acceptance Criteria

- API can create all three example plan shapes.
- Current phase can be resolved from date.
- Subject-specific exam date is supported.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
