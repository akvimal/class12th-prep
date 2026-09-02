# AGENTS.md

These instructions apply to Codex and all AI coding assistants working in this repository.

## 1. Product source of truth

Read, in order:

1. `docs/SRS.md`
2. `docs/DOMAIN_MODEL.md`
3. `docs/ALGORITHMS.md`
4. `docs/ACADEMIC_DATA.md`
5. The active task file

Do not silently change requirements. If implementation conflicts with the specification, document the conflict before changing architecture.

## 2. Work only on the requested task

When asked to implement a task:

- implement only that task and required dependencies;
- do not proactively implement future phases;
- do not add speculative product features;
- update tests and relevant docs with the same change;
- report migrations, API changes and unresolved decisions.

## 3. Non-negotiable domain rules

- No calendar-month-specific planning logic.
- Plan behavior derives from `PreparationPlan` and `PlanPhase` dates.
- Curriculum is separate from student progress.
- Historical assessments, errors and readiness snapshots are immutable evidence; corrections should be auditable.
- Official board data must never be presented as inferred data or vice versa.
- School tests complement board preparation; do not create duplicate academic tracks.
- Core scheduler, readiness and revision engines are deterministic.
- AI may later assist explanation/classification, but must not become the authority for official curriculum, official weightage or core scheduling.
- Objective test/recall evidence must outweigh confidence.
- Never solve schedule pressure by silently exceeding configured student capacity.
- Missed tasks return to the candidate queue for reprioritization.

## 4. Configuration, not magic constants

Scoring weights, recency factors, urgency multipliers, revision intervals and plan thresholds must be versioned configuration. Defaults may exist, but domain services must not scatter constants through UI/API code.

## 5. Architecture

Keep domain logic outside UI components and HTTP handlers.

Preferred layers:

- UI
- API/application services
- domain services
- persistence
- background jobs/event delivery

Domain services should be executable in unit tests without a browser or external AI service.

## 6. Data integrity

- Use migrations for schema changes.
- Add foreign keys and uniqueness constraints where domain invariants permit.
- Store timestamps consistently.
- Keep academic-year/curriculum version provenance.
- Preserve readiness history using snapshots/events where appropriate.
- Do not overwrite assessment history merely because a later readiness calculation changes.

## 7. Testing

Every task must include automated tests.

At minimum:

- unit tests for domain rules;
- integration tests for persistence/API changes;
- regression fixtures for scheduler/readiness changes;
- E2E only for critical user journeys.

Use `fixtures/synthetic-academic-data.json`. It is synthetic and must never be labeled as official CBSE chapter weightage.

## 8. UX rules

- Mobile first.
- Maximum three primary tasks on the Today screen.
- Daily logging should normally take under two minutes.
- Avoid guilt-oriented language and backlog explosion.
- Recommendations must expose a compact `Why this?`.
- Parent surfaces are aggregate, not surveillance-oriented.
- Do not add gamification/social features unless explicitly requested.

## 9. Security/privacy

- Enforce role-based authorization server-side.
- Student academic data is private by default.
- Parent-safe summary endpoints must be separate from detailed activity endpoints.
- Never log credentials or unnecessary sensitive free text.

## 10. Completion report

At the end of a task, report:

- files changed;
- migrations created;
- tests added/run;
- acceptance criteria status;
- assumptions;
- follow-up task dependencies.

Do not mark a task complete if acceptance criteria are failing.
