import { sql } from 'drizzle-orm';
import { boolean, check, date, integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { academicYears } from './academic-years';
import { subjects } from './curriculum';

/**
 * A student's enrolment in one subject for an academic year
 * (docs/DOMAIN_MODEL.md `SubjectEnrollment`).
 *
 * `enabled` lets a subject that exists in the curriculum be left out of a
 * student's plan (e.g. the bootstrap student excludes English —
 * docs/ACADEMIC_DATA.md). `boardExamDate` is null until the timetable is known;
 * when set it overrides the plan's generic exam window for this subject
 * (docs/SRS.md §5).
 */
export const subjectEnrollments = pgTable(
  'subject_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    theoryMaxMarks: integer('theory_max_marks'),
    practicalMaxMarks: integer('practical_max_marks'),
    targetMarks: integer('target_marks'),
    boardExamDate: date('board_exam_date'),
    enabled: boolean('enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique('subject_enrollments_year_subject_unique').on(t.academicYearId, t.subjectId),
    check(
      'subject_enrollments_marks_non_negative',
      sql`(${t.theoryMaxMarks} is null or ${t.theoryMaxMarks} >= 0)
        and (${t.practicalMaxMarks} is null or ${t.practicalMaxMarks} >= 0)
        and (${t.targetMarks} is null or ${t.targetMarks} >= 0)`,
    ),
  ],
);

export type SubjectEnrollment = typeof subjectEnrollments.$inferSelect;
