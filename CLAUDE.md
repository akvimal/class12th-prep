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
- PWA: `public/manifest.webmanifest` + `public/sw.js` (installability + an
  offline fallback only — never caches app data) registered by
  `src/components/register-sw.tsx`. Icons regenerate with
  `node scripts/make-icons.mjs`. `/offline` is the fallback page. The
  middleware matcher lets `sw.js`, the manifest, icons and `/offline` through.
- Deploy: `Dockerfile` (single image, `next start`, full deps for the
  `db:migrate` / `prep:init` one-off commands) + `docker-compose.yml`
  `deploy` profile (`app` + `caddy`) + `Caddyfile`. `output: 'standalone'`
  was removed. The `db` service publishes **no host port** — `app`/migrate/init
  reach it on the internal network; `pnpm db:up` layers `docker-compose.dev.yml`
  to expose `${DB_HOST_PORT:-5432}` for local `pnpm dev`. See README "Deploy to a VPS".
- Passcode gate (`src/middleware.ts` + `src/lib/passcode.ts`, Web Crypto for the
  edge). On only when `PREP_PASSCODE` (student, full access) is set — off for
  dev/CI. Optional `PREP_PARENT_PASSCODE` opens a `parent` session confined to
  `/parent` (`PARENT_ALLOWED`); `resolveRole` maps a passcode → role, the
  30-day HMAC cookie carries the role, `readSession` verifies it. `unlockAction`
  sets the cookie `secure` only when `x-forwarded-proto` is https (so it works
  over plain HTTP on a VPS IP). No accounts.
- Parent view: `src/app-services/parent.ts` `getParentSummary` is a **projection**
  built from its own shape — readiness, risk, `revisionDays` (studied y/n),
  upcoming tests. No session logs, timestamps or component scores. `/parent`
  renders only this.
- Screen mutations go through Server Actions in `src/app/actions.ts`
  (`'use server'`, zod-validated FormData) → `src/app-services/study-flow.ts`
  → `revalidatePath` + `redirect`. `logStudy` records the immutable session
  then stamps `lastStudiedAt` (+ `lastRevisedAt` for `isRevisionSession`
  types) and recomputes that chapter's readiness — it never infers component
  scores or advances `state`. `updateChapterSelfAssessment` applies an
  explicit self-rating patch + recomputes. Recording a session still never
  mutates progress inside the `session` service itself.
- The single real student profile is created by `pnpm prep:init` (script →
  `initRealProfile`, `src/app-services/init.ts`) from `config/student.json`
  (gitignored; copy `config/student.example.json`). Idempotent. `getActiveProfile`
  (`src/app-services/profile.ts`) resolves first student → newest academic year
  → its ACTIVE plan.
- Priority (`src/domain/planning/priority.ts`, config `priority-v1`,
  ALGORITHMS §3): `raw = weakness · revisionDue · schoolUrgency · importance ·
backlog`; `prioritize()` ranks + normalises. Pure; consumed by the daily
  planner / Study Now.
- Spaced revision (`src/domain/revision/`, config `revision-v1`, ALGORITHMS §7):
  `firstRevision` / `nextRevision(number, outcome, doneOn)` → next `{ dueDate,
method }`. `revision_schedules` (`drizzle/0010`, one SCHEDULED row per
  academic-year+chapter — partial unique index; DONE rows are history).
  `RevisionRepository`. `src/app-services/revision.ts`: `ensureRevisionScheduled`
  (on reaching LEARNED via the ratings form), `recordRevisionOutcome` (from a
  REVISION/ACTIVE_RECALL/PYQ session in `logStudy` — confidence → outcome,
  `completion:'NO'` → FAILED), `revisionStateForChapter` (feeds the planner —
  replaced the old `lastRevisedAt` heuristic in `candidates.ts`),
  `getRevisionQueue` (drives `/revision`). The seed schedules R1 for learned
  chapters.
- Domain events (Phase 2, SRS §13 — persisted now, delivered in Phase 7):
  `domain_events` (`drizzle/0009`, unique `(student_id, dedupe_key)` for
  idempotent generation), `src/domain/events/`, `EventRepository`
  (`append` = upsert-by-dedupe), `src/app-services/events.ts`
  (`emitEvent`, `listEvents`, `detectDailyEvents` = SCHOOL_TEST_APPROACHING /
  PREBOARD_APPROACHING / REVISION_DUE / REVISION_OVERDUE / STUDY_BLOCK_MISSED /
  REPEATED_ERROR_DETECTED for a day). `GET/POST /api/academic-years/[id]/events`.
  No delivery yet (Phase 7).
- Weekly review (Phase 3, config `review-v1`): `src/domain/review/weekly-review.ts`
  `buildWeeklyReview` (pure — sessions, time-by-activity, accuracy, per-subject
  readiness delta, rhythm/adherence, revisions, errors, focus list). Stored in
  `weekly_reviews` (`drizzle/0013`, one row per (year, week start), `summary`
  jsonb). `src/app-services/weekly-review.ts` `generateWeeklyReview(repos, ay,
asOf, {announce})` — window is `[asOf−7, asOf−1]`, upserts, emits
  `WEEKLY_REVIEW_READY` (deduped per week) only when `announce`. `/review` renders
  the latest (regenerating with `announce:false`); the worker announces on a
  7-day boundary from plan start.
- Daily worker (Phase 3, `src/jobs/`): `runDailyJobs(repos, asOf)` for the active
  profile — `reconcilePastTasks` → regenerate + `persistDailyPlan` →
  `detectDailyEvents` → `generateWeeklyReview`. Idempotent. Entrypoint
  `scripts/run-daily-jobs.ts`
  (`pnpm jobs:daily [YYYY-MM-DD]`), run from host cron; never on the request path
  (`/today` calls `syncTodayPlan` for the same effect opportunistically).
- Study Now (`src/domain/planning/study-now.ts`, ALGORITHMS §4, config
  `planner-v1`): `minutes + candidates → one task + reason codes + timed
micro-plan`. Deterministic. `src/app-services/study-now.ts` `getStudyNow`;
  `/study-now?mins=` renders it.
- Daily planner (`src/domain/planning/daily-planner.ts`, config `planner-v1`,
  ALGORITHMS §3/§5): candidates → `prioritize` → guardrails (prereq eligibility,
  time-fit, `maxPerSubject`, revision-starvation, school-urgency force ≤3d,
  low-priority starvation) → ≤3 primary + optional. Pure/deterministic.
  `src/app-services/candidates.ts` builds `PlannerCandidate[]` from progress +
  readiness snapshots + `nextSchoolTestDaysByChapter` + revision schedules +
  `studyTask.missedCountByChapter` (the priority backlog factor).
  `src/app-services/today.ts` `getTodayPlan(...,energy)` wires capacity +
  candidates → `buildDailyPlan` (pure read); `syncTodayPlan` = reconcile past +
  build + persist. `/today` calls `syncTodayPlan`; `?energy=low|high` scales the
  target (never real capacity).
- Study tasks + missed-work reprioritisation (Phase 3, ALGORITHMS §6):
  `study_tasks` (`drizzle/0012`, one open row per (year, chapter, day) — partial
  unique index; `slot` PRIMARY/OPTIONAL, `reasonCodes`, `priorityScore` snapshot).
  `src/domain/planning/study-task.ts` `resolveTaskStatus` (past day → COMPLETED
  if a session for that chapter landed on/after the planned date, else MISSED;
  today/future → left SCHEDULED). `StudyTaskRepository.saveDailyPlan` is
  idempotent (cancels rows it no longer proposes, skips already-completed
  chapters). `src/app-services/study-tasks.ts`: `persistDailyPlan`,
  `reconcilePastTasks`, `resolveTasksForSession` (same-day close from `logStudy`).
  A MISSED task is never re-created for today — its chapter's `missedCount`
  raises priority instead. `study_sessions.study_task_id` now FKs (set null).
- Study windows (Phase 2): `study_windows` (`drizzle/0008`),
  `src/domain/planning/study-window.ts` (recurrence WEEKDAY/WEEKEND/DAILY,
  `plannedMinutesOn`), `StudyWindowRepository`, `src/app-services/study-windows.ts`
  (`getWeeklyRhythm` = planned-vs-done adherence per day). `GET/POST
/api/academic-years/[id]/study-windows`. `DEFAULT_STUDY_WINDOWS` created by
  the seed and `prep:init`. Windows drive reminders + adherence, never tasks.
- Assessments (Phase 2, announce-only — no results yet): `assessments` +
  `assessment_chapters` (`drizzle/0007`), `src/domain/assessment/`,
  `AssessmentRepository`, `src/app-services/assessment.ts`
  (`addAssessment` validates + resolves keys, `listUpcomingAssessments`,
  `nextSchoolTestDaysByChapter` for the planner). `POST/GET
/api/academic-years/[id]/assessments`. Seed loads `spec.assessments`.
- Assessment results + errors (Phase 3, SRS §8): `assessment_results`
  (one per assessment, unique FK, `score` 0..`maxMarks` CHECK) + `question_errors`
  (`marksLost > 0` CHECK, `errorType` / `state` pgEnums, `drizzle/0011`).
  `src/domain/errors/errors.ts`: error state machine
  NEW→REVIEWED→CORRECTED→RETEST_DUE→MASTERED (`advanceErrorState`, throws
  `ErrorTransitionError`); FAIL_RETEST drops RETEST_DUE→CORRECTED; MASTERED
  terminal. `isKnowledgeGap` splits concept gaps from exam-technique slips.
  `validateAssessmentResult` / `assertAssessmentResult` — tagged marks must not
  exceed marks dropped. `AssessmentResultRepository` (`recordResult` in a txn,
  `listErrors` scoped by academic year via JOIN, `advanceError`).
  `src/app-services/assessment-results.ts`: `recordAssessmentResult` (rejects
  chapters the test didn't cover, marks the assessment COMPLETED),
  `listQuestionErrors` (adds chapter/subject names), `advanceQuestionError`.
  `recordResultAction` / `advanceErrorAction` in `src/app/actions.ts`;
  `/tests/result?assessment=` enters a result, `/tests` shows "Errors to clear".
- Assessment recalibration (Phase 4, ALGORITHMS §10, config `recalibration-v1`):
  `src/domain/assessment/recalibration.ts` `recalibrateFromResult` (pure) turns a
  result into component-score patches for the **tested chapters only** — EWMA
  toward the observed value, weight by assessment type (PREBOARD 0.6 … class test
  0.25). Never replaces readiness with the %. Knowledge-gap errors (non-MEMORY)
  also drag `conceptScore`; MEMORY drags `recallScore`; exam-technique slips touch
  only `testScore`. `applyAssessmentRecalibration` (in `assessment-results.ts`,
  called by `recordAssessmentResult`) applies the patches + recomputes readiness
  as of the exam date.
- Projected score + marks opportunity (Phase 4, ALGORITHMS §11, config
  `projection-v1`): `src/domain/projection/projection.ts` `projectSubjectScore`
  (pure) blends weighted chapter readiness with graded-assessment % (pre-board >
  class test), shrinks while evidence is thin, returns `null` until coverage ≥
  `minCoverage` **and** ≥ `minAssessments` graded tests. Never exceeds
  `projectionCeiling`. `src/app-services/projection.ts` `getBoardProjection` →
  per-subject `{projectedPct, projectedMarks, marksOpportunity, drivers}` + a
  syllabus-weighted overall (targets from `subject_enrollments`). `/trajectory`
  renders it, real curve from `getReadinessTrend`; nothing shown until a subject
  qualifies.
- Repeated-error patterns (Phase 4, SRS §12, config `error-patterns-v1`):
  `src/domain/errors/patterns.ts` `detectErrorPatterns` (pure) — same error type
  ≥ `minChapterOccurrences` in a chapter, or ≥ `minSubjectOccurrences` across ≥ 2
  chapters of a subject (past the marks-lost floor). `src/app-services/error-patterns.ts`
  `getErrorPatterns` (adds names); `detectDailyEvents` raises
  `REPEATED_ERROR_DETECTED` once per pattern (error type folded into the dedupe
  key). `/tests` shows a "Recurring" section; chapter detail shows readiness
  history + that chapter's test errors (`getChapterView`).
- Plan pressure (Phase 5, ALGORITHMS §8, config `plan-pressure-v1`):
  `src/domain/planning/plan-pressure.ts` `computePlanPressure` (pure) weighs
  weighted-syllabus-remaining + revision + assessment burden against real
  capacity to the syllabus target → LOW/NORMAL/HIGH/CRITICAL + drivers. On a
  deficit it returns concrete `tradeoffs` (defer N chapters / +min per day /
  move target D days) — never silently exceeds capacity.
  `src/app-services/plan-pressure.ts` `getPlanPressure`; `/trajectory` renders it.
- End a task with a report: files changed, migrations, tests run, acceptance
  criteria status, assumptions, follow-up dependencies.
