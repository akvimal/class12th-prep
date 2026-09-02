# Architecture

## Goals

- deterministic, testable academic decision engine;
- product-ready multi-student data model;
- mobile-first web/PWA;
- easy local development and containerization;
- parent/notification features can be added without rewriting core services.

## Logical architecture

```text
Web/PWA
  |
API / Application Layer
  |
  +-- Plan Service
  +-- Curriculum Service
  +-- School Context Service
  +-- Priority Engine
  +-- Daily Planner
  +-- Revision Engine
  +-- Assessment/Error Service
  +-- Readiness Engine
  +-- Weekly Review Service
  +-- Domain Event Service
  |
Repository/Persistence Layer
  |
PostgreSQL

Background Worker
  +-- revision due processing
  +-- plan-risk evaluation
  +-- domain notification-event generation
```

## Boundaries

### Curriculum domain
Board-controlled/versioned academic master data. Never stores student-specific progress.

### Student planning domain
Academic year, enrollment, preparation plan, plan phases, capacity and school calendar.

### Learning evidence domain
Study sessions, assessments, errors, revision outcomes and readiness snapshots.

### Delivery domain
UI/API, parent-safe projection, notifications. Must not own academic algorithms.

## Recommended modules

```text
src/
  app-or-ui/
  api/
  domain/
    curriculum/
    planning/
    revision/
    assessment/
    readiness/
    events/
  persistence/
  jobs/
  config/
```

Names may vary by framework, but separation must remain.

## Time/date rules

- Store calendar dates as dates when time-of-day is irrelevant.
- Store timestamps in UTC.
- Interpret school/exam dates in the student's configured timezone.
- Avoid month-name branching.
- Plan phase is determined by plan configuration and current date.

## Algorithm configuration

Use a versioned configuration record or configuration module with explicit version ID.

Example:

```json
{
  "version": "planner-v1",
  "readinessWeights": {},
  "recencyFactors": {},
  "schoolUrgency": {},
  "revisionIntervalsDays": [1,3,7,14,30]
}
```

Historical readiness snapshots should retain the algorithm/config version used.

## Events

Use domain events internally even before external messaging exists. Persist important events if they drive future notifications/auditing.

## Multi-tenancy

MVP may have a single family, but schema should include `family/tenant` ownership boundaries. Do not build institution features yet.

## AI boundary

No AI dependency in core path. Future AI adapters must sit outside deterministic domain services.
