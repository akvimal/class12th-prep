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
  reference (domain guard + DB CHECK). The real (but **derived / unofficial**)
  Class XII tree for a live student profile is
  `fixtures/cbse-class12-2026-27-curriculum.json`, parsed + guarded by
  `src/persistence/seed/cbse-curriculum.ts` (`cbseClass12Curriculum`) — chapter
  lists need a per-school review pass and every weight is an estimate
  (`needsReview: true`, no `OFFICIAL`).
- Plan phases are derived from the plan's dates (`src/domain/planning/plan-phases.ts`,
  config `phases-v1`) and regenerated on every plan change — callers never
  write `plan_phases` directly. See `docs/DECISIONS/ADR-006`. Date arithmetic
  lives in `src/domain/planning/dates.ts` — ISO strings, UTC, no month logic.
- API request bodies are validated with zod schemas; `parseJson` +
  `domainErrorResponse` in `src/lib/http.ts` turn failures into 400s with
  machine-readable field errors.
- Daily study capacity = plan weekday/weekend minutes adjusted by
  `school_calendar_events` (`src/domain/planning/school-calendar.ts`, config
  `school-calendar-v1`, ADR-007). Priority-based conflict resolution; the
  calendar never creates tasks. Read via `getDailyCapacity` / `getCapacityRange`.
- Drizzle `getPlan`/`getVersion` etc. THROW on a malformed UUID (Postgres) —
  tests for "not found" must use a well-formed UUID like all-zeros. The
  in-memory repos return null.
- Synthetic seed: `fixtures/synthetic-seed.json` (validated by `src/persistence/seed/spec.ts`),
  loaded by `seedSynthetic()` / `pnpm db:seed` — idempotent (skips if the
  curriculum version exists; use `pnpm db:reset` for a clean slate). Tests
  reuse it via `createSeededTestDatabase()`. Its `assessments` section is a
  placeholder for Phase 2.
- Chapter progress (`src/persistence/schema/chapter-progress.ts`,
  `src/domain/progress/`) is student state per (academic year, chapter),
  entirely separate from curriculum. `state` may move backward — not enforced.
  `effectiveReadiness` is null until the readiness engine (TASK-009) computes
  it. Read the hierarchy-with-progress via `getCurriculumProgress`.
- Study sessions (`src/persistence/schema/study-sessions.ts`, `src/domain/progress/study-session.ts`)
  are immutable evidence — `recordSession` appends, no update. Recording one
  NEVER changes chapter progress (that's the readiness engine, TASK-009).
  `chapterId` implies `subjectId` (DB CHECK); the `session` app-service
  resolves keys/ids and the subject.
- Integration tests share one PGlite instance per file: `createTestDatabase()`
  in `beforeAll`, `truncateAll(db)` (+ `seedTestDatabase(db)` for seeded files)
  in `beforeEach`. Don't put `createTestDatabase` in `beforeEach`.
- Readiness (`src/domain/readiness/`, config `readiness-v1`, ADR-008):
  `raw = Σ component·weight`, `effective = raw·recency` (decay by days since
  last revision; never-revised → factor 1). Confidence is NOT an input.
  `calculateChapterReadiness` / `recalculateAcademicYearReadiness` append an
  immutable `readiness_snapshots` row and cache `chapter_progress.effectiveReadiness`.
  Recalc never rewrites history.
- UI screens render from `uiContext()` (`src/app-services/app-context.ts`),
  never from a repo directly — it resolves the repos plus `academicYearId`,
  `planId`, `asOf`, `studentName`, `isDemo`. `APP_DATA_SOURCE`
  (`memory` | `database`; default `memory` unless `NODE_ENV=production` + a
  `DATABASE_URL`) picks between the throwaway synthetic seed and the real
  profile. `memory` mode pins `asOf` to `DEMO_DATE`; `database` mode uses
  today. `uiContext()` redirects to `/welcome` when the DB is selected but
  has no profile.
- The single real student profile is created by `pnpm prep:init` (script →
  `initRealProfile`, `src/app-services/init.ts`) from `config/student.json`
  (gitignored; copy `config/student.example.json`). Idempotent. `getActiveProfile`
  (`src/app-services/profile.ts`) resolves first student → newest academic year
  → its ACTIVE plan.
- End a task with a report: files changed, migrations, tests run, acceptance
  criteria status, assumptions, follow-up dependencies.
