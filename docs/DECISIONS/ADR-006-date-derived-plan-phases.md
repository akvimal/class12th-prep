# ADR-006: Date-derived plan phases

**Status:** Accepted (TASK-004)

## Decision

The six semantic phases (`FOUNDATION`, `SYLLABUS_COVERAGE`, `CONSOLIDATION`,
`REVISION`, `PREBOARD`, `BOARD_EXAM`) are **derived from the plan's configured
dates** by a pure function (`src/domain/planning/plan-phases.ts`) and persisted
as `plan_phases` rows whenever the plan is created or its dates change.

Mapping from the plan's six dates:

| Phase | Span |
|---|---|
| FOUNDATION | `start` → `start + foundationDays` (only if `foundationDays > 0`) |
| SYLLABUS_COVERAGE | → `syllabusTargetDate` |
| CONSOLIDATION | → `revisionStartDate` |
| REVISION | → `preboardStart` |
| PREBOARD | → `examWindowStart` |
| BOARD_EXAM | → `examWindowEnd` |

`preboardStart = clamp(examWindowStart − preboardLeadDays, revisionStartDate, examWindowStart)`.

`foundationDays` and `preboardLeadDays` are versioned config
(`src/config/phases.ts`, `phases-v1`). Each generated `plan_phases` row records
the config version in its `config_json`.

A phase that would be zero-length is omitted, so a tight plan simply has fewer
phases. A boundary day belongs to the phase that is beginning.

## Why

- Extends ADR-001 (date-driven planning): a July–February, September–February
  or 90-day plan produces sensible phases with no code change and no
  calendar-month logic.
- Persisting the rows (rather than resolving on the fly everywhere) gives the
  later trajectory / planner / weekly-review engines a stable table to query,
  and an audit trail of the config that produced each phase.
- `hard_completion_date` is intentionally **not** a phase boundary — it is a
  deadline used by trajectory-risk detection, not a phase edge.

## Consequences

- `createPlan` / `updatePlan` regenerate phases transactionally; callers never
  write `plan_phases` directly.
- A future "custom phase configuration" (per DOMAIN_MODEL) would supply explicit
  phase dates that override this derivation; the door is left open via
  `plan_phases.config_json` and a plan-level config, but no override UI exists
  yet.
