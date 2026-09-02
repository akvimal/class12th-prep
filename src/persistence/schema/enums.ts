import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enum values match the domain vocabulary in docs/DOMAIN_MODEL.md and
 * docs/SRS.md verbatim, so there is no mapping layer between the database
 * and `src/domain`.
 */

export const planStatus = pgEnum('plan_status', ['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const phaseType = pgEnum('phase_type', [
  'FOUNDATION',
  'SYLLABUS_COVERAGE',
  'CONSOLIDATION',
  'REVISION',
  'PREBOARD',
  'BOARD_EXAM',
]);

// --- Curriculum & provenance (TASK-003) ---

/** The academic scope an AcademicWeight applies to. */
export const curriculumScopeType = pgEnum('curriculum_scope_type', [
  'SUBJECT',
  'UNIT',
  'CHAPTER',
  'TOPIC',
]);

/**
 * Where a weight came from (docs/ACADEMIC_DATA.md). OFFICIAL and DERIVED_* are
 * never conflated: OFFICIAL requires a source reference, DERIVED_* carry a
 * confidence.
 */
export const weightSourceType = pgEnum('weight_source_type', [
  'OFFICIAL',
  'DERIVED_SQP',
  'DERIVED_PYQ',
  'SCHOOL_TEACHER',
  'USER',
]);

/** How a weight's numeric value should be read. */
export const weightUnit = pgEnum('weight_unit', ['PERCENT', 'MARKS', 'COUNT', 'RELATIVE']);

// --- Student chapter progress (TASK-007) ---

export const chapterState = pgEnum('chapter_state', [
  'NOT_STARTED',
  'LEARNING',
  'LEARNED',
  'PRACTISED',
  'TESTED',
  'REVISED',
  'EXAM_READY',
]);

export const confidenceLevel = pgEnum('confidence_level', ['WEAK', 'MODERATE', 'STRONG']);

export const interestLevel = pgEnum('interest_level', ['DISLIKE', 'NEUTRAL', 'LIKE']);

export const schoolChapterStatus = pgEnum('school_chapter_status', [
  'NOT_TAUGHT',
  'CURRENTLY_TEACHING',
  'COMPLETED',
  'REVISING',
]);

// --- Study session evidence (TASK-008) ---

export const studySessionType = pgEnum('study_session_type', [
  'LEARN',
  'PRACTISE',
  'ACTIVE_RECALL',
  'REVISION',
  'PYQ',
  'CHAPTER_TEST',
  'UNIT_TEST',
  'SAMPLE_PAPER',
  'FULL_PAPER',
  'ERROR_CORRECTION',
  'SCHOOL_HOMEWORK',
]);

export const sessionCompletion = pgEnum('session_completion', ['YES', 'PARTIAL', 'NO']);

// --- Readiness snapshots (TASK-009) ---

export const readinessScopeType = pgEnum('readiness_scope_type', [
  'CHAPTER',
  'SUBJECT',
  'ACADEMIC_YEAR',
]);

// --- Assessments (Phase 2) ---

/** School tests, pre-boards, self tests, PYQ, sample papers and full mocks (SRS §14). */
export const assessmentType = pgEnum('assessment_type', [
  'SCHOOL_CLASS_TEST',
  'SCHOOL_UNIT_TEST',
  'SCHOOL_HALF_YEARLY',
  'PREBOARD',
  'SELF_TEST',
  'PYQ',
  'SAMPLE_PAPER',
  'FULL_MOCK',
]);

/** Announce-only in Phase 2; results (COMPLETED) come with the assessment feedback loop. */
export const assessmentStatus = pgEnum('assessment_status', [
  'ANNOUNCED',
  'COMPLETED',
  'CANCELLED',
]);

/** Recurrence of a study window (Phase 2). */
export const studyWindowDayType = pgEnum('study_window_day_type', ['WEEKDAY', 'WEEKEND', 'DAILY']);

// --- Domain events (SRS §13) ---

export const domainEventType = pgEnum('domain_event_type', [
  'REVISION_DUE',
  'REVISION_OVERDUE',
  'SCHOOL_TEST_APPROACHING',
  'PREBOARD_APPROACHING',
  'STUDY_BLOCK_MISSED',
  'PLAN_AT_RISK',
  'WEEKLY_REVIEW_READY',
  'REPEATED_ERROR_DETECTED',
  'SYLLABUS_TARGET_AT_RISK',
]);

/** Events are generated now; a delivery channel is wired in Phase 7. */
export const domainEventDelivery = pgEnum('domain_event_delivery', [
  'PENDING',
  'DELIVERED',
  'SUPPRESSED',
]);

// --- Spaced revision (Phase 3) ---

export const revisionOutcome = pgEnum('revision_outcome', ['STRONG', 'MODERATE', 'WEAK', 'FAILED']);

export const revisionMethod = pgEnum('revision_method', [
  'ACTIVE_RECALL',
  'BLANK_PAGE',
  'PRACTISE',
  'PYQ',
  'FLASHCARDS',
]);

export const revisionStatus = pgEnum('revision_status', [
  'SCHEDULED',
  'DONE',
  'MISSED',
  'CANCELLED',
]);
