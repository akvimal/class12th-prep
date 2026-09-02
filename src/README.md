# Source layout

Layer boundaries follow `docs/ARCHITECTURE.md`. The rule: **domain logic stays
out of UI components and HTTP handlers**, and each layer only talks to the one
below it.

```
src/
  app/           Next.js App Router — the UI and route handlers. Thin: it calls
                 app-services and renders. No domain logic here.
  app-services/  Use-cases. Orchestrate domain + repositories. The only thing
                 app/ is allowed to call. context.ts is the composition root.
  domain/        Pure logic — no Next, no DB, no HTTP. Runs in Vitest on plain
                 node. Sub-areas (from later tasks): curriculum, planning,
                 revision, assessment, readiness, events.
  persistence/   ports.ts defines repository interfaces. Implementations:
                   in-memory/  fixture-backed — shell + tests
                   drizzle/    PostgreSQL via Drizzle — real deployments
                 schema/  Drizzle table definitions (TASK-002 onward).
  jobs/          Background workers (revision-due, plan-risk, events). Phase 3+.
  config/        Versioned algorithm configuration — weights, factors,
                 intervals. Never inline constants (AGENTS.md §4).
  lib/           Cross-cutting infrastructure: env access, db pool.
```

## Dependency direction

`app` → `app-services` → (`domain`, `persistence` ports) → `persistence` impls → `lib`

`domain` depends on nothing in this tree. `config` is a leaf consumed by
`domain`. Nothing imports `app` or `app-services` from `domain`.
