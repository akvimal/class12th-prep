import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { academicYears } from './academic-years';
import { chapters, subjects } from './curriculum';
import { assessmentStatus, assessmentType } from './enums';

/**
 * A scheduled test (docs/DOMAIN_MODEL.md `Assessment`). Phase 2 is
 * announce-only — no `AssessmentResult` yet. `exam_date` feeds the planner's
 * school-urgency factor; `assessment_chapters` scopes which chapters it covers.
 */
export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    type: assessmentType('type').notNull(),
    name: text('name').notNull(),
    examDate: date('exam_date').notNull(),
    maxMarks: integer('max_marks'),
    status: assessmentStatus('status').notNull().default('ANNOUNCED'),
    announcedAt: timestamp('announced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('assessments_max_marks_positive', sql`${t.maxMarks} is null or ${t.maxMarks} > 0`)],
);

export const assessmentChapters = pgTable(
  'assessment_chapters',
  {
    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.chapterId] })],
);

export type AssessmentRow = typeof assessments.$inferSelect;
export type AssessmentChapterRow = typeof assessmentChapters.$inferSelect;
