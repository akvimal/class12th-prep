import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { SCHOOL_EVENT_TYPES } from '@/domain/planning/school-calendar';
import { WEIGHT_SOURCE_TYPES, WEIGHT_UNITS } from '@/domain/curriculum/provenance';
import { CONFIDENCE_LEVELS } from '@/domain/progress/chapter-progress';
import { SESSION_COMPLETIONS, STUDY_SESSION_TYPES } from '@/domain/progress/study-session';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const weight = z.object({
  value: z.number(),
  unit: z.enum(WEIGHT_UNITS),
  sourceType: z.enum(WEIGHT_SOURCE_TYPES),
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
  topics: z
    .array(
      z.object({
        key: z.string().min(1),
        name: z.string().min(1),
        weights: z.array(weight).optional(),
      }),
    )
    .optional(),
});

const unit = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  weights: z.array(weight).optional(),
  chapters: z.array(chapter).optional(),
});

const subject = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  code: z.string().nullish(),
  weights: z.array(weight).optional(),
  units: z.array(unit).optional(),
});

export const seedSpecSchema = z.object({
  meta: z.object({
    kind: z.literal('SYNTHETIC_TEST_DATA'),
    official: z.literal(false),
    warning: z.string(),
    seedKey: z.string().min(1),
  }),
  family: z.object({ name: z.string().min(1) }),
  student: z.object({
    displayName: z.string().min(1),
    board: z.string().min(1),
    grade: z.number().int().min(1).max(12),
    timezone: z.string().min(1),
  }),
  academicYear: z.object({
    yearLabel: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
  }),
  curriculum: z.object({
    version: z.object({
      board: z.string().min(1),
      grade: z.number().int(),
      academicYearLabel: z.string().min(1),
      version: z.string().min(1),
      sourceReference: z.string().nullish(),
    }),
    publish: z.boolean().optional(),
    subjects: z.array(subject).min(1),
  }),
  enrollments: z
    .array(
      z.object({
        subjectKey: z.string().min(1),
        theoryMaxMarks: z.number().int().min(0).optional(),
        practicalMaxMarks: z.number().int().min(0).optional(),
        targetMarks: z.number().int().min(0).optional(),
        boardExamDate: isoDate.nullish(),
        enabled: z.boolean().optional(),
      }),
    )
    .min(1),
  plan: z.object({
    startDate: isoDate,
    syllabusTargetDate: isoDate,
    hardCompletionDate: isoDate,
    revisionStartDate: isoDate,
    examWindowStart: isoDate,
    examWindowEnd: isoDate,
    weekdayCapacityMinutes: z.number().int().min(0),
    weekendCapacityMinutes: z.number().int().min(0),
    activate: z.boolean().optional(),
  }),
  calendarEvents: z
    .array(
      z.object({
        type: z.enum(SCHOOL_EVENT_TYPES),
        title: z.string().nullish(),
        startDate: isoDate,
        endDate: isoDate,
        capacityOverride: z.number().int().min(0).nullish(),
        notes: z.string().nullish(),
      }),
    )
    .default([]),
  /** Consumed by TASK-007 (ChapterProgress) — no schema for it yet. */
  chapterProgress: z
    .array(
      z.object({
        chapterKey: z.string().min(1),
        readiness: z.number().min(0).max(100),
        schoolStatus: z.enum(['NOT_TAUGHT', 'CURRENTLY_TEACHING', 'COMPLETED', 'REVISING']),
      }),
    )
    .default([]),
  studySessions: z
    .array(
      z.object({
        chapterKey: z.string().min(1).optional(),
        subjectKey: z.string().min(1).optional(),
        type: z.enum(STUDY_SESSION_TYPES),
        completion: z.enum(SESSION_COMPLETIONS),
        sessionDate: isoDate,
        plannedMinutes: z.number().int().min(0).nullish(),
        actualMinutes: z.number().int().min(0),
        attempted: z.number().int().min(0).nullish(),
        correct: z.number().int().min(0).nullish(),
        confidenceAfter: z.enum(CONFIDENCE_LEVELS).nullish(),
      }),
    )
    .default([]),
  /** Consumed by the Phase 2 assessment task — no schema for it yet. */
  assessments: z
    .array(
      z.object({
        date: isoDate,
        type: z.string().min(1),
        subjectKey: z.string().min(1),
        name: z.string().min(1),
        chapterKeys: z.array(z.string()),
        maxMarks: z.number().int().min(0),
      }),
    )
    .default([]),
});

export type SeedSpec = z.infer<typeof seedSpecSchema>;

const fixturePath = fileURLToPath(
  new URL('../../../fixtures/synthetic-seed.json', import.meta.url),
);

/** The parsed, validated synthetic seed. Throws at import time if the file drifts from the schema. */
export const syntheticSeedSpec: SeedSpec = seedSpecSchema.parse(
  JSON.parse(readFileSync(fixturePath, 'utf8')),
);
