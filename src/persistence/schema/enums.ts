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
