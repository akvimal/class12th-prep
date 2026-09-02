import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { families } from './families';

/**
 * A student belongs to exactly one family. `board`/`grade` are kept generic
 * (not enums) so the schema does not assume CBSE or Class XII for future
 * users (docs/ACADEMIC_DATA.md "Current product bootstrap").
 */
export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id')
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    board: text('board').notNull(),
    grade: integer('grade').notNull(),
    /** IANA timezone name, e.g. "Asia/Kolkata". Interpreted per docs/ARCHITECTURE.md. */
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    active: boolean('active').notNull().default(true),
    ...timestamps,
  },
  (t) => [check('students_grade_range', sql`${t.grade} between 1 and 12`)],
);

export type Student = typeof students.$inferSelect;
export type NewStudentRow = typeof students.$inferInsert;
