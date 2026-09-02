# CLAUDE.md

Guidance for AI coding agents working in this repo. Read `AGENTS.md` first — it
is the authority; this file is the quick operational map.

## What this is

A date-driven CBSE board-exam preparation tracker. Deterministic planning /
readiness core, mobile-first PWA, no AI in the critical path. Full spec in
`docs/`; task breakdown in `tasks/`; milestone map in `design/build-plan.html`.

## Stack & commands

- Next.js 15 (App Router) + TypeScript + Tailwind v4 · PostgreSQL 16 + Drizzle · Vitest + Playwright · pnpm

```bash
pnpm install
cp .env.example .env && pnpm db:up      # local Postgres
pnpm dev                                 # http://localhost:3000
pnpm check                               # format:check + lint + typecheck + test  <- run before committing
pnpm build                               # must pass
pnpm test:e2e                            # Playwright (needs db:up)
```

## Layout

See `src/README.md`. In short: `app/` (thin UI + routes) → `app-services/`
(use-cases) → `domain/` (pure, no I/O) + `persistence/ports.ts` →
`persistence/{in-memory,drizzle}/` → `lib/`. `config/` holds versioned
algorithm configuration. `jobs/` is background work (Phase 3+).

`domain/` code must run under Vitest with no browser and no database.

## Non-negotiable rules (from AGENTS.md §3)

- No calendar-month branching. Behaviour derives from `PreparationPlan` /
  `PlanPhase` dates.
- Curriculum master data is separate from student progress and never mutated to
  represent it.
- Assessments, errors and readiness snapshots are immutable evidence.
- `OFFICIAL` vs `DERIVED_*` academic weightage never conflated, in data or UI.
- Scoring weights / factors / intervals live in `src/config`, versioned — never
  inline constants.
- Objective test/recall evidence outweighs self-reported confidence.
- Never exceed configured student capacity silently.
- Missed tasks return to the candidate queue for reprioritization.

## Working method

- Implement **one task at a time** against its acceptance criteria. Do not
  build ahead into future phases.
- Every change ships its tests: unit for domain rules, integration for
  persistence/API, regression fixtures for engine changes (`fixtures/`).
- Use migrations for schema changes: edit `src/persistence/schema/*`, run
  `pnpm db:generate`, commit the SQL in `drizzle/`. Add FK and uniqueness
  constraints where invariants allow.
- Persistence integration tests use PGlite (in-process Postgres) via
  `src/persistence/testing/test-db.ts` — no Docker needed for `pnpm test`.
  See `docs/DECISIONS/ADR-005`.
- Curriculum is versioned master data (`src/persistence/schema/curriculum.ts`).
  Never edit a published version in place — create a new `CurriculumVersion`.
  Load a tree with `importCurriculum()`; synthetic tree in
  `fixtures/synthetic-curriculum.json`. `OFFICIAL` weights require a source
  reference (domain guard + DB CHECK).
- End a task with a report: files changed, migrations, tests run, acceptance
  criteria status, assumptions, follow-up dependencies.
