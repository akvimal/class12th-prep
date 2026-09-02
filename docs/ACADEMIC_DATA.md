# Academic Data and Provenance

## Purpose

Prevent incorrect or invented board information from entering the product.

## Source precedence

1. Official board curriculum
2. Official sample question papers and marking schemes
3. Actual previous board papers
4. School/teacher instructions
5. Derived application analytics
6. Student estimates

## Provenance fields

Every imported or manually created academic importance record should support:

- source type
- source reference/document URL or identifier
- board
- grade
- academic year/curriculum version
- subject code where available
- retrieval/import date
- parser/import version
- confidence for derived data

## Weightage source types

- OFFICIAL
- DERIVED_SQP
- DERIVED_PYQ
- SCHOOL_TEACHER
- USER

Never display derived chapter importance as official CBSE chapter marks.

## Curriculum versioning

Do not update a prior academic year's curriculum in place. Create a new `CurriculumVersion` and map subjects/units/chapters/topics.

## Import workflow

1. create curriculum version;
2. import/enter subject hierarchy;
3. validate subject codes/names;
4. attach provenance;
5. validate no duplicate hierarchy IDs;
6. publish version;
7. student academic year references published version.

## Synthetic data

`fixtures/synthetic-academic-data.json` is development-only. It deliberately uses illustrative derived weights and must be labeled TEST_DATA/SYNTHETIC in UI/tests.

## Current product bootstrap

The initial product is intended for CBSE Class XII 2026-27, excluding English for the first student configuration. The schema must not assume these exact subjects or this exclusion for future users.
