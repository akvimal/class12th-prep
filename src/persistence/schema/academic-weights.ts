import { sql } from 'drizzle-orm';
import { check, date, doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';
import { curriculumVersions, chapters, subjects, topics, units } from './curriculum';
import { curriculumScopeType, weightSourceType, weightUnit } from './enums';

/**
 * Academic importance attached to one node of the curriculum hierarchy
 * (docs/DOMAIN_MODEL.md `AcademicWeight`, docs/ACADEMIC_DATA.md).
 *
 * Exactly one of subject/unit/chapter/topic id is set (CHECK). Provenance is
 * mandatory: an OFFICIAL weight must carry a `sourceReference`; derived weights
 * carry a `confidence`. OFFICIAL and DERIVED_* are never presented as each other.
 */
export const academicWeights = pgTable(
  'academic_weights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumVersionId: uuid('curriculum_version_id')
      .notNull()
      .references(() => curriculumVersions.id, { onDelete: 'cascade' }),

    scopeType: curriculumScopeType('scope_type').notNull(),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }),

    value: doublePrecision('value').notNull(),
    unit: weightUnit('unit').notNull(),

    sourceType: weightSourceType('source_type').notNull(),
    /** Document URL / identifier. Required for OFFICIAL. */
    sourceReference: text('source_reference'),
    /** 0..1, for derived data. */
    confidence: doublePrecision('confidence'),

    effectiveFrom: date('effective_from').notNull(),
    /** When the underlying document was retrieved / imported. */
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
    /** Version of the parser / import routine, for auditability. */
    parserVersion: text('parser_version'),
    ...timestamps,
  },
  (t) => [
    check(
      'academic_weights_exactly_one_scope',
      sql`num_nonnulls(${t.subjectId}, ${t.unitId}, ${t.chapterId}, ${t.topicId}) = 1`,
    ),
    check(
      'academic_weights_scope_type_matches',
      sql`(${t.scopeType} = 'SUBJECT' and ${t.subjectId} is not null)
        or (${t.scopeType} = 'UNIT' and ${t.unitId} is not null)
        or (${t.scopeType} = 'CHAPTER' and ${t.chapterId} is not null)
        or (${t.scopeType} = 'TOPIC' and ${t.topicId} is not null)`,
    ),
    check(
      'academic_weights_official_needs_reference',
      sql`${t.sourceType} <> 'OFFICIAL' or ${t.sourceReference} is not null`,
    ),
    check(
      'academic_weights_confidence_range',
      sql`${t.confidence} is null or (${t.confidence} >= 0 and ${t.confidence} <= 1)`,
    ),
  ],
);

export type AcademicWeight = typeof academicWeights.$inferSelect;
