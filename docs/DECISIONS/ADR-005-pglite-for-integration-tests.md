# ADR-005: PGlite for persistence integration tests

**Status:** Accepted (TASK-002)

## Decision

Integration tests that exercise the database (constraints, foreign keys,
partial indexes, migrations, repositories) run against **PGlite** — PostgreSQL
16 compiled to WebAssembly, run in-process — not a containerised Postgres.

Each test file gets a fresh PGlite instance, applies the committed migrations
in `drizzle/`, and tears it down. Helper: `src/persistence/testing/test-db.ts`.

## Why

- No Docker requirement for `pnpm test`; the suite runs the same everywhere,
  including CI without a service container and on machines where Docker Desktop
  is not running.
- Real Postgres semantics — `CHECK` constraints, `gen_random_uuid()`, partial
  unique indexes and enum types all behave exactly as in production.
- Applying the real migration folder on every run means every integration test
  also proves "the migration applies to an empty database" (TASK-001..002
  acceptance criteria).

## Consequences

- `@electric-sql/pglite` is a dev dependency.
- The production driver stays `node-postgres`; repositories are typed against
  the shared `PgDatabase` base (`src/persistence/drizzle/db.ts`) so the same
  repository code runs on both.
- CI additionally runs `drizzle-kit migrate` against a real Postgres service
  container as a belt-and-braces check on the generated SQL.
- Behaviour PGlite does not cover (connection pooling, concurrency, replication)
  is out of scope for these tests and belongs in a later load/DB-ops pass.
