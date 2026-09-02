# TASK-001 - Project Bootstrap

## Objective

Create the runnable repository skeleton, local development environment and CI-quality checks without implementing product features.

## Dependencies

None.

## In Scope

- Select/initialize the agreed web/API stack.
- PostgreSQL local dependency.
- Docker/Docker Compose local setup.
- Environment configuration example.
- Formatting, linting and unit-test runner.
- Health endpoint/page.
- Basic CI workflow if repository supports it.
- Folder/module boundaries consistent with `docs/ARCHITECTURE.md`.

## Out of Scope

Authentication product flows, curriculum, planner, UI screens beyond a health/shell page.

## Business / Architecture Rules

Do not put domain logic in UI components. Do not introduce an AI dependency.

## Automated Tests

- Application starts locally.
- Database service is reachable.
- Health check passes.
- Lint/typecheck/test commands pass in a clean checkout.

## Acceptance Criteria

- One documented command sequence starts the local system.
- `README.md` setup instructions are accurate.
- CI/local quality commands pass.

## Definition of Done

- Implementation is complete only for this task's scope.
- Relevant docs are updated.
- Migrations/config changes are committed.
- Automated tests pass.
- No future-phase functionality is added speculatively.
- Agent completion report lists files changed, tests run, assumptions and follow-up dependencies.
