# Test Strategy

## Goal

Make the planning engine safe to evolve with Codex/AI coding assistants by requiring deterministic regression coverage.

## Layers

### Unit tests
Domain formulas, state transitions, phase/date logic, priority guardrails, revision intervals.

### Integration tests
Database constraints, repositories, API validation, transactional updates.

### End-to-end tests
Only critical flows:
- setup plan;
- add school test -> plan changes;
- complete task -> revision created;
- record test/error -> readiness/remediation changes;
- change plan date -> trajectory recalculates.

## Golden synthetic fixture

Use `fixtures/synthetic-academic-data.json`.

Never substitute live/official weightage in deterministic unit tests.

## Required regression scenarios

1. School test in 3 days raises affected priority.
2. Cancelling the test restores normal ranking.
3. Missed day does not double next-day workload.
4. Successful learning creates default revisions.
5. Weak recall shortens interval.
6. Poor assessment creates error/remediation and reduces relevant readiness.
7. Strong self-confidence cannot override poor objective test evidence.
8. Repeated calculation errors are detected.
9. Target risk is raised before hard deadline.
10. Revision phase is date-driven.
11. Pre-board evidence materially changes affected priorities.
12. Study Now chooses a time-compatible urgent task.
13. July-February plan works with no month-specific code.
14. 90-day plan reports pressure without silently exceeding capacity.
15. Changing plan dates preserves historical evidence.
16. Subject-specific exam date removes subject after exam.
17. Parent-safe projection excludes detailed activity.
18. Domain notification event is generated even when delivery channels are disabled.

## Determinism

For scheduler/readiness tests freeze:

- current date/time;
- timezone;
- algorithm config version;
- fixture data.

Same input must produce the same result.

## Property/invariant tests

Where practical:

- readiness stays in 0..100;
- priority normalization stays in range;
- plan never schedules negative minutes;
- primary planned minutes <= configured capacity unless explicitly user-overridden;
- official source type requires provenance reference;
- error cannot become MASTERED without required retest evidence;
- plan phase resolution never depends on month name.

## Acceptance gate

A task is not complete until its task-specific tests and relevant regression tests pass.
