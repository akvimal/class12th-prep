import { sql } from 'drizzle-orm';
import { check, date, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { curriculumVersions } from './curriculum';
import { students } from './students';

/**
 * A student may have several academic years (docs/DOMAIN_MODEL.md invariant 6).
 *
 * `curriculumVersionId` references a published CurriculumVersion (TASK-003).
 * ON DELETE RESTRICT — master data in use is never removed out from under a
 * student.
 */
export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    yearLabel: text('year_label').notNull(),
    curriculumVersionId: uuid('curriculum_version_id').references(() => curriculumVersions.id, {
      onDelete: 'restrict',
    }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('academic_years_student_label_unique').on(t.studentId, t.yearLabel),
    check('academic_years_dates_ordered', sql`${t.startDate} < ${t.endDate}`),
  ],
);

export type AcademicYear = typeof academicYears.$inferSelect;
export type NewAcademicYearRow = typeof academicYears.$inferInsert;
