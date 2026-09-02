# Domain Model

## Aggregate overview

```text
Family/Tenant
  -> Student
     -> AcademicYear
        -> PreparationPlan
        -> SubjectEnrollment
        -> SchoolCalendarEvent
        -> ChapterProgress
        -> StudyTask / StudySession
        -> Assessment / AssessmentResult
        -> QuestionError
        -> RevisionSchedule
        -> ReadinessSnapshot
        -> WeeklyReview
```

Curriculum master is referenced, not owned, by the student aggregate.

## Core entities

### Family
`id, name, created_at`

### Student
`id, family_id, display_name, board, grade, timezone, active`

### AcademicYear
`id, student_id, year_label, curriculum_version_id, start_date, end_date`

### PreparationPlan
`id, academic_year_id, start_date, syllabus_target_date, hard_completion_date, revision_start_date, exam_window_start, exam_window_end, weekday_capacity_minutes, weekend_capacity_minutes, status`

Invariant: dates must be logically ordered unless a documented custom phase configuration explicitly permits otherwise.

### PlanPhase
`id, preparation_plan_id, phase_type, start_date, end_date, config_json`

Phase types:
FOUNDATION, SYLLABUS_COVERAGE, CONSOLIDATION, REVISION, PREBOARD, BOARD_EXAM.

### CurriculumVersion
`id, board, grade, academic_year_label, version, source_reference, published_at`

### Subject / Unit / Chapter / Topic
Master academic hierarchy with stable IDs inside a curriculum version.

### AcademicWeight
`id, scope_type, scope_id, value, unit, source_type, source_reference, confidence, effective_from`

Source types:
OFFICIAL, DERIVED_PYQ, DERIVED_SQP, SCHOOL_TEACHER, USER.

### SubjectEnrollment
`id, academic_year_id, subject_id, theory_max_marks, practical_max_marks, target_marks, board_exam_date, enabled`

### ChapterProgress
`id, academic_year_id, chapter_id, state, confidence, interest, school_status, concept_score, practice_score, test_score, recall_score, revision_score, effective_readiness, last_studied_at, last_revised_at`

School status:
NOT_TAUGHT, CURRENTLY_TEACHING, COMPLETED, REVISING.

### SchoolCalendarEvent
`id, academic_year_id, type, title, start_at/date, end_at/date, capacity_override, notes`

Types:
NORMAL_SCHOOL_DAY, HOLIDAY, STUDY_LEAVE, EXAM_DAY, PRACTICAL_DAY, VACATION, UNAVAILABLE.

### Assessment
`id, academic_year_id, subject_id, type, name, announced_at, exam_date, max_marks, status`

### AssessmentScope
Links assessment to chapters/topics.

### AssessmentResult
`id, assessment_id, score, time_taken_minutes, unattempted_count, recorded_at`

### AssessmentScopeResult
Optional chapter/topic marks/performance.

### QuestionError
`id, assessment_id, subject_id, chapter_id, topic_id?, marks_lost, error_type, state, notes?, retest_due_date`

### StudyTask
Planned academic action. `type, subject/chapter/topic, planned_minutes, reason_codes, priority_snapshot, status, planned_date`.

### StudySession
Evidence of actual work. `task_id?, type, planned_minutes, actual_minutes, completion, attempted, correct, confidence_after, started_at, ended_at`.

### RevisionSchedule
`id, chapter/topic, revision_number, due_date, status, method, source_session_id`

### ReadinessSnapshot
Immutable calculated evidence: `scope_type, scope_id, readiness, component_json, recency_factor, algorithm_version, calculated_at`.

### WeeklyReview
Stored generated summary for audit/comparison.

### DomainEvent
`event_type, student_id, aggregate_type/id, payload, created_at, delivery_status`.

## State rules

### Chapter
NOT_STARTED -> LEARNING -> LEARNED -> PRACTISED -> TESTED -> REVISED -> EXAM_READY

Transitions may move backward when strong contradictory evidence arrives.

### Error
NEW -> REVIEWED -> CORRECTED -> RETEST_DUE -> MASTERED

A correction alone cannot skip directly to MASTERED without successful retest evidence.

## Important invariants

1. Curriculum master records are never mutated to represent student progress.
2. Assessment history is evidence and is not overwritten by readiness recalculation.
3. Changing plan dates recalculates plan outputs, not historical learning evidence.
4. Parent access is a projection of permitted aggregates, not direct access to all student events.
5. Official academic data always retains provenance.
6. One student may have multiple academic years.
7. A student may have historical plans; exactly one plan may be designated active for a given academic year in the MVP.
