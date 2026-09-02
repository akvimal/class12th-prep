# Algorithms

All algorithms in this document are deterministic MVP defaults. Values must be configuration/versioned.

## 1. Readiness

Component scores are 0..100.

Default:

```text
raw =
 concept * 0.20
+ practice * 0.25
+ test * 0.30
+ recall * 0.15
+ revision * 0.10
```

Default recency factors after last successful revision:

- <7 days: 1.00
- 7-14: 0.97
- 15-30: 0.92
- 31-45: 0.85
- >45: 0.75

`effective_readiness = raw * recency_factor`

Rules:

- recent objective assessment evidence updates test score;
- successful active recall updates recall/revision;
- confidence is an input to planning but cannot directly dominate readiness;
- readiness may decrease after poor objective evidence;
- every calculation records algorithm version.

## 2. Academic importance

Prefer official unit weightage where applicable. Do not fabricate official chapter marks.

Chapter/topic planning importance may combine:

- normalized parent unit official weight;
- derived SQP/PYQ frequency;
- teacher priority;
- prerequisite role.

The UI must expose provenance.

## 3. Priority

Conceptual model:

```text
priority = normalize(
 weightage_factor
 * weakness_factor
 * revision_due_factor
 * school_urgency_factor
 * board_importance_factor
 * backlog_factor
)
```

`weakness_factor` increases as effective readiness decreases.

Default school urgency:

- none: 1.00
- <=14d: 1.10
- <=7d: 1.25
- <=3d: 1.50
- tomorrow: 1.80

These are defaults, not hardcoded UI constants.

### Guardrails

After ranking, planner applies constraints:

1. prerequisite eligibility;
2. time compatibility;
3. subject diversity;
4. revision starvation protection;
5. school-test urgency;
6. lower-priority starvation protection;
7. daily capacity.

## 4. Study Now

Input:

- current date/time context;
- available minutes;
- student/plan;
- active school events;
- candidate tasks.

Process:

1. generate eligible candidates;
2. discard tasks that cannot be meaningfully performed in available time;
3. score candidates;
4. apply guardrails;
5. return one task with reason codes and micro-plan.

Output must be deterministic for fixed fixture/config.

## 5. Daily plan

Inputs:

- daily capacity;
- energy override;
- school-day/holiday capacity;
- candidate tasks;
- due revisions;
- assessments.

Target maximum: three primary cards.

Unfilled capacity may expose optional extra work.

## 6. Missed work

Never mechanically move all missed tasks.

```text
MISSED/PARTIAL task
 -> update evidence if partial
 -> return remaining need to candidate generation
 -> recalculate next plan under normal capacity
```

## 7. Revision

Initial intervals from successful learning:

`1, 3, 7, 14, 30 days`

Outcome mapping:

- STRONG: extend next interval by configurable factor;
- MODERATE: use standard interval;
- WEAK: shorten interval and consider targeted practice;
- FAILED: create relearning/practice and early retest.

Revision method is activity-specific, not generic rereading.

## 8. Plan pressure

Inputs:

- remaining usable days;
- configured capacity;
- weighted syllabus remaining;
- due revision burden;
- upcoming assessment burden.

Produce:

LOW, NORMAL, HIGH, CRITICAL.

The engine must return explanatory drivers.

If capacity is insufficient, surface trade-offs rather than silently exceeding capacity.

## 9. Trajectory risk

Compare expected weighted completion by date against actual weighted readiness/coverage.

Risk events:

- PLAN_AT_RISK
- SYLLABUS_TARGET_AT_RISK

Risk must be detected before the hard deadline.

## 10. Assessment recalibration

Assessment evidence affects only tested scopes where possible.

Pre-board/full mock receives higher evidence weight than small class test, configurable by assessment type.

Do not simply replace readiness with percentage score; update relevant component evidence.

## 11. Marks opportunity

Planning metric, not guaranteed prediction.

For a subject:

`opportunity ~= target_score - projected_score`, floored at zero.

Projection model should remain conservative and versioned. Implement only after sufficient evidence exists.
