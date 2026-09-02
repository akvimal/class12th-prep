import { z } from 'zod';
import curriculumFixture from '../../../fixtures/cbse-class12-2026-27-curriculum.json';
import type { CurriculumTree } from '@/app-services/curriculum-import';
import { WEIGHT_SOURCE_TYPES, WEIGHT_UNITS } from '@/domain/curriculum/provenance';

/**
 * The real (but unofficial) CBSE Class XII curriculum used for a live student
 * profile. Chapter lists follow the NCERT / CBSE 2025-26 syllabus; every weight
 * is a hand-entered ESTIMATE of exam importance — none of it is OFFICIAL board
 * weightage. Edit `fixtures/cbse-class12-2026-27-curriculum.json` and re-import
 * to correct anything. See docs/DECISIONS if this graduates to a real import.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const weight = z.object({
  value: z.number(),
  unit: z.enum(WEIGHT_UNITS),
  // A live student profile must never carry a weight labelled OFFICIAL without a
  // proper sourced import — this fixture is explicitly derived/estimated.
  sourceType: z.enum(WEIGHT_SOURCE_TYPES).refine((s) => s !== 'OFFICIAL', {
    message: 'the derived curriculum fixture must not contain OFFICIAL weights',
  }),
  sourceReference: z.string().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  effectiveFrom: isoDate,
  retrievedAt: z.string().nullish(),
  parserVersion: z.string().nullish(),
});

const chapter = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  weights: z.array(weight).optional(),
});

const unit = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  chapters: z.array(chapter).min(1),
});

const subject = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  code: z.string().nullish(),
  units: z.array(unit).min(1),
});

export const cbseCurriculumSchema = z.object({
  meta: z.object({
    kind: z.literal('DERIVED_UNOFFICIAL'),
    official: z.literal(false),
    board: z.string().min(1),
    grade: z.number().int(),
    academicYearLabel: z.string().min(1),
    needsReview: z.boolean(),
    warning: z.string().min(1),
    source: z.string().min(1),
  }),
  version: z.object({
    board: z.string().min(1),
    grade: z.number().int(),
    academicYearLabel: z.string().min(1),
    version: z.string().min(1),
    sourceReference: z.string().nullish(),
  }),
  publish: z.boolean().optional(),
  subjects: z.array(subject).min(1),
});

export type CbseCurriculumFixture = z.infer<typeof cbseCurriculumSchema>;

const parsed: CbseCurriculumFixture = cbseCurriculumSchema.parse(curriculumFixture);

/** All chapter keys, in document order. */
export const cbseChapterKeys: string[] = parsed.subjects.flatMap((s) =>
  s.units.flatMap((u) => u.chapters.map((c) => c.key)),
);

const duplicateKey = cbseChapterKeys.find((k, i) => cbseChapterKeys.indexOf(k) !== i);
if (duplicateKey) {
  throw new Error(`cbse curriculum fixture: duplicate chapter key "${duplicateKey}"`);
}

/** The parsed fixture as an `importCurriculum` tree (drops the `meta` block). */
export const cbseClass12Curriculum: CurriculumTree = {
  version: parsed.version,
  subjects: parsed.subjects,
  publish: parsed.publish ?? true,
};

export const cbseCurriculumMeta = parsed.meta;
