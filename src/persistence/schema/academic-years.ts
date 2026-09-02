import { sql } from 'drizzle-orm';
import { check, date, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { students } from './students';

/**
 * A student may have several academic years (docs/DOMAIN_MODEL.md invariant 6).
 *
 * `curriculumVersionId` is added here to match the domain model but is left
 * without a foreign key until TASK-003 introduces the CurriculumVersion table.
 */
export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    yearLabel: text('year_label').notNull(),
    curriculumVersionId: uuid('curriculum_version_id'),
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
