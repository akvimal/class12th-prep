# ADR-008: Readiness engine v1

**Status:** Accepted (TASK-009)

## Decision

Chapter readiness is a pure function of five component scores, a recency
factor, and versioned config (`src/domain/readiness/readiness.ts`,
`src/config/readiness.ts` = `readiness-v1`). Per docs/ALGORITHMS.md §1:

```
raw       = concept·0.20 + practice·0.25 + test·0.30 + recall·0.15 + revision·0.10
recency   = f(days since last successful revision)
effective = clamp(raw · recency, 0, 100)
```

Recency bands (`readiness-v1`): `<7d → 1.00`, `7–14 → 0.97`, `15–30 → 0.92`,
`31–45 → 0.85`, `>45 → 0.75`. **A chapter that has never been revised gets
factor 1.00** — its low `revisionScore` (0) already carries the penalty, so an
extra decay would double-count it.

Each calculation **appends** an immutable `readiness_snapshots` row
(`raw`, `recencyFactor`, `readiness`, the component JSON, `algorithmVersion`,
`calculatedFor`). Recalculation never rewrites history. The current value is
also cached on `chapter_progress.effectiveReadiness`.

## Why

- **Deterministic and explainable** (ADR-002): same components + config + date
  always give the same numbers; every snapshot says which config produced it.
- **Confidence is not an input.** `computeReadiness` doesn't take it — planning
  may use self-rated confidence, but objective evidence alone drives readiness
  (SRS §4). A STRONG-confidence chapter with a weak test score has low readiness.
- **Immutable snapshots** give the weekly-review and trajectory engines a
  truthful history to diff against, and survive a weights change.

## Consequences

- Weights, bands, and the never-revised factor are config, not constants.
- `recalculateAcademicYearReadiness` re-snapshots every chapter with a progress
  record; the seed runs it as of the plan start date so seeded readiness is
  deterministic.
- Assessment-type evidence weighting and projected marks are explicitly **not**
  here — TASK for Phase 4.
- Subject / overall readiness aggregation is scoped in the schema
  (`readiness_scope_type`) but not computed yet.
