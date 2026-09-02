import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';

/**
 * Board-controlled, versioned academic master data (docs/ARCHITECTURE.md,
 * docs/ACADEMIC_DATA.md). It never stores student-specific progress.
 *
 * A prior year's curriculum is never edited in place — a new CurriculumVersion
 * is created and the hierarchy re-entered. `publishedAt` gates whether a
 * student's academic year may reference it.
 */
export const curriculumVersions = pgTable(
  'curriculum_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    board: text('board').notNull(),
    grade: integer('grade').notNull(),
    academicYearLabel: text('academic_year_label').notNull(),
    version: text('version').notNull(),
    /** Document URL / identifier the hierarchy was taken from. */
    sourceReference: text('source_reference'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('curriculum_versions_identity_unique').on(
      t.board,
      t.grade,
      t.academicYearLabel,
      t.version,
    ),
    check('curriculum_versions_grade_range', sql`${t.grade} between 1 and 12`),
  ],
);

/**
 * Every hierarchy level carries `curriculumVersionId` (so a stable `key` is
 * unique within the version) plus a composite foreign key back to its parent
 * on `(parentId, curriculumVersionId)` — which makes it impossible for a
 * chapter to sit under a unit from a different version.
 */
export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumVersionId: uuid('curriculum_version_id')
      .notNull()
      .references(() => curriculumVersions.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    code: text('code'),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('subjects_version_key_unique').on(t.curriculumVersionId, t.key),
    unique('subjects_id_version_unique').on(t.id, t.curriculumVersionId),
  ],
);

export const units = pgTable(
  'units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumVersionId: uuid('curriculum_version_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: 'units_subject_fk',
      columns: [t.subjectId, t.curriculumVersionId],
      foreignColumns: [subjects.id, subjects.curriculumVersionId],
    }).onDelete('cascade'),
    unique('units_version_key_unique').on(t.curriculumVersionId, t.key),
    unique('units_id_version_unique').on(t.id, t.curriculumVersionId),
  ],
);

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumVersionId: uuid('curriculum_version_id').notNull(),
    unitId: uuid('unit_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: 'chapters_unit_fk',
      columns: [t.unitId, t.curriculumVersionId],
      foreignColumns: [units.id, units.curriculumVersionId],
    }).onDelete('cascade'),
    unique('chapters_version_key_unique').on(t.curriculumVersionId, t.key),
    unique('chapters_id_version_unique').on(t.id, t.curriculumVersionId),
  ],
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumVersionId: uuid('curriculum_version_id').notNull(),
    chapterId: uuid('chapter_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: 'topics_chapter_fk',
      columns: [t.chapterId, t.curriculumVersionId],
      foreignColumns: [chapters.id, chapters.curriculumVersionId],
    }).onDelete('cascade'),
    unique('topics_version_key_unique').on(t.curriculumVersionId, t.key),
  ],
);

export type CurriculumVersion = typeof curriculumVersions.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Topic = typeof topics.$inferSelect;
