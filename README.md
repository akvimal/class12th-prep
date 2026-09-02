# CBSE Board Preparation Tracker

Product-ready, date-driven study preparation system for board-exam students.

## Core goal

Turn curriculum, school progress, tests, revision history and actual performance
into a small, realistic daily plan that maximizes exam readiness.

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

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL 16 + Drizzle ORM
- Vitest (unit / integration) + Playwright (critical E2E only)
- pnpm, Docker Compose for local Postgres

Layer boundaries are documented in [`src/README.md`](src/README.md) and
`docs/ARCHITECTURE.md`. If the stack changes, record it in `docs/DECISIONS/`.

## Getting started

Prerequisites: **Node 20.11+**, **Docker**, and **pnpm** (via Corepack —
`corepack enable`).

```bash
pnpm install
cp .env.example .env
pnpm db:up            # start Postgres 16 in Docker
pnpm db:migrate       # apply schema
pnpm db:seed          # load the synthetic validation data (idempotent)
pnpm dev              # http://localhost:3000
```

`pnpm db:reset` drops the volume, restarts Postgres and re-migrates for a clean
slate; follow it with `pnpm db:seed`.

`http://localhost:3000` and `http://localhost:3000/api/health` report app and
database status. The domain, persistence and API layers exist (Phase 0
complete); the UI is still the service shell until the coded UI shell milestone.

### Quality checks

```bash
pnpm check            # format:check + lint + typecheck + test
pnpm test:e2e         # Playwright (needs `pnpm db:up` and a one-time `pnpm exec playwright install chromium`)
```

CI runs the same checks plus `pnpm build` on every push and pull request
(`.github/workflows/ci.yml`).

### Common commands

| Command                                         | Purpose                                             |
| ----------------------------------------------- | --------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`        | Next.js dev server / production build / serve build |
| `pnpm db:up` / `pnpm db:down` / `pnpm db:reset` | Start / stop / wipe + recreate the local Postgres   |
| `pnpm db:generate` / `pnpm db:migrate`          | Generate / apply Drizzle migrations                 |
| `pnpm db:seed`                                  | Load `fixtures/synthetic-seed.json` (idempotent)    |
| `pnpm test` / `pnpm test:watch`                 | Vitest                                              |
| `pnpm lint` / `pnpm typecheck` / `pnpm format`  | Individual quality gates                            |

## Documents

- `docs/SRS.md` - concise engineering source of truth
- `docs/ARCHITECTURE.md` - component boundaries
- `docs/DOMAIN_MODEL.md` - entities, states and invariants
- `docs/ALGORITHMS.md` - deterministic planning/readiness algorithms
- `docs/ACADEMIC_DATA.md` - curriculum and provenance policy
- `docs/UX_FLOWS.md` - UX journeys and interaction constraints
- `docs/API_SPEC.md` - API contract baseline
- `docs/TEST_STRATEGY.md` - automated validation strategy
- `design/` - mobile UI screen designs (`.dc.html`) + build plan
- `AGENTS.md` - mandatory rules for Codex/AI coding agents

## Development sequence

Start with Phase 0. Do not ask an agent to implement the entire SRS at once.

1. `tasks/PHASE-00/TASK-001-project-bootstrap.md` ✅
2. `TASK-002-core-database-schema.md` ✅
3. `TASK-003-curriculum-model.md` ✅
4. `TASK-004-student-academic-year-plan.md` ✅
5. `TASK-005-school-calendar.md` ✅
6. `TASK-006-seed-validation-data.md` ✅
7. Continue with Phase 1 (`tasks/PHASE-01/`).

Each task must be implemented independently and pass its acceptance criteria
before moving forward. The full milestone map is in `design/build-plan.html`.
