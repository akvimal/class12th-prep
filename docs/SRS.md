# Software Requirements Specification - Engineering Edition

## 1. Purpose

Build a configurable board-exam preparation product that converts curriculum, school activity, revision history and assessment evidence into realistic daily recommendations.

The system must support arbitrary preparation windows: e.g. July-February, September-February or a 90-day intensive plan.

## 2. Core outcomes

The student should be able to answer:

- What should I study now?
- What should I revise now?
- What school test should influence my board preparation?
- Where am I losing marks?
- Am I on track for the configured syllabus target and exam dates?

## 3. Primary users

### Student - critical
Full preparation workflow.

### Parent - medium priority
Aggregate on-track/readiness/subject-risk view. No minute-by-minute surveillance.

### Admin - basic/critical
Curriculum, academic year, plan dates, configuration and corrections.

### Teacher/institution - later
Future product extension.

## 4. Product invariants

- School and board preparation are one academic plan.
- A chapter is not `EXAM_READY` because it was merely read.
- Test, practice and recall evidence matter more than self-confidence.
- Official and derived weightage are separate concepts.
- Plan phases are semantic and date-driven.
- Daily workload cannot silently exceed configured capacity.
- Missed work is reprioritized.
- Core intelligence is deterministic and explainable.

## 5. Preparation plan

Required fields:

- start date
- syllabus target date
- hard completion date
- revision start date
- exam window start/end
- weekday/weekend capacity
- status
- phase configuration

Semantic phases:

- FOUNDATION
- SYLLABUS_COVERAGE
- CONSOLIDATION
- REVISION
- PREBOARD
- BOARD_EXAM

Subject-specific board exam dates override generic exam-window planning when available.

## 6. Academic hierarchy

`Board -> Grade -> AcademicYear -> CurriculumVersion -> Subject -> Unit -> Chapter -> Topic -> Competency`

Student progress must not be stored in curriculum-master records.

## 7. Progress/readiness

Chapter state:

`NOT_STARTED -> LEARNING -> LEARNED -> PRACTISED -> TESTED -> REVISED -> EXAM_READY`

Readiness components:

- concept
- practice
- test
- recall
- revision

Initial default weighting:

`20%, 25%, 30%, 15%, 10%`

Apply recency decay after successful revision. Configuration must be versioned.

## 8. School alignment

Track:

- not taught / currently teaching / completed / revising
- school tests
- term exams
- pre-boards
- practicals/projects
- holidays/study leave

An approaching school test increases priority for the affected curriculum. Its result becomes board-readiness evidence.

## 9. Daily planner

Candidate task priority is based on:

- academic importance/weightage
- weakness
- revision due
- school urgency
- board importance
- backlog/trajectory
- prerequisites
- available time
- subject-balance guardrails

Today should normally expose at most three primary cards.

`Study Now` accepts available minutes and returns one suitable task plus `Why this?`.

## 10. Revision

Initial default intervals:

`+1, +3, +7, +14, +30 days`

Strong retrieval may extend the interval; weak/failed retrieval shortens it and can create practice/relearning.

Revision methods should emphasize retrieval, representative questions and prior-error retrying.

## 11. Assessment/error loop

Assessment types include school tests, pre-boards, self tests, PYQ, sample papers and full mocks.

Error types include:

- CONCEPT
- FORMULA_RECALL
- MEMORY
- CALCULATION
- MISREAD_QUESTION
- WRONG_METHOD
- INCOMPLETE_STEPS
- PRESENTATION
- TIME_MANAGEMENT
- CARELESS
- UNKNOWN

Error state:

`NEW -> REVIEWED -> CORRECTED -> RETEST_DUE -> MASTERED`

## 12. Metrics

- chapter/subject/overall readiness
- syllabus trajectory
- revision health
- projected score (planning estimate)
- marks opportunity
- repeated error patterns
- plan pressure

## 13. Parent and notifications

Design domain/API support now; UI/delivery later.

Domain events:

- REVISION_DUE
- REVISION_OVERDUE
- SCHOOL_TEST_APPROACHING
- PREBOARD_APPROACHING
- PLAN_AT_RISK
- WEEKLY_REVIEW_READY
- REPEATED_ERROR_DETECTED
- SYLLABUS_TARGET_AT_RISK

## 14. Delivery priority

- Phase 0: product foundation - critical
- Phase 1: student tracker - critical
- Phase 2: school alignment + planner - critical
- Phase 3: revision + errors - critical
- Phase 4: assessment intelligence - high
- Phase 5: exam mode - high
- Phase 6: parent dashboard - medium
- Phase 7: notification channels - medium
- Phase 8: AI/teacher/institution - later

## 15. First-production definition of done

A production candidate must support arbitrary plan dates, curriculum/versioning, school progress/tests, capacity-aware daily planning, Study Now, revision, assessment/error feedback, readiness, weekly review, plan-risk detection and date-derived revision/exam behavior with automated validation tests.
