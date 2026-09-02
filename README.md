# CBSE Board Preparation Tracker

Product-ready, date-driven study preparation system for board-exam students.

## Core goal

Turn curriculum, school progress, tests, revision history and actual performance into a small, realistic daily plan that maximizes exam readiness.

Core loop:

`Plan -> Study -> Practise -> Test -> Analyse Errors -> Revise -> Retest -> Exam Ready`

## Important design rules

- Never hardcode months such as September, January or February into scheduling logic.
- `PreparationPlan` dates determine phases.
- School preparation and board preparation are one plan.
- Official academic data and inferred/derived importance must remain distinguishable.
- Core scheduling/readiness logic is deterministic and testable.
- Test/recall evidence outweighs self-reported confidence.
- Missed work is reprioritized, not blindly carried forward.
- Parent dashboard and external notification delivery are important but not on the MVP critical path.

## Recommended stack

The SRS is framework-neutral. A pragmatic implementation is:

- Next.js + TypeScript
- PostgreSQL
- ORM: Prisma or Drizzle
- PWA/responsive web UI
- Background jobs for revision/notification events
- Docker Compose for local development

If a different stack is chosen, record the decision in `docs/DECISIONS/`.

## Documents

- `docs/SRS.md` - concise engineering source of truth
- `docs/ARCHITECTURE.md` - component boundaries
- `docs/DOMAIN_MODEL.md` - entities, states and invariants
- `docs/ALGORITHMS.md` - deterministic planning/readiness algorithms
- `docs/ACADEMIC_DATA.md` - curriculum and provenance policy
- `docs/UX_FLOWS.md` - UX journeys and interaction constraints
- `docs/API_SPEC.md` - API contract baseline
- `docs/TEST_STRATEGY.md` - automated validation strategy
- `AGENTS.md` - mandatory rules for Codex/AI coding agents

## Development sequence

Start with Phase 0. Do not ask an agent to implement the entire SRS at once.

1. `tasks/PHASE-00/TASK-001-project-bootstrap.md`
2. `TASK-002-core-database-schema.md`
3. `TASK-003-curriculum-model.md`
4. `TASK-004-student-academic-year-plan.md`
5. `TASK-005-school-calendar.md`
6. `TASK-006-seed-validation-data.md`
7. Continue with Phase 1.

Each task must be implemented independently and pass its acceptance criteria before moving forward.
