import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { importCurriculum } from '@/app-services/curriculum-import';
import { getCurriculumProgress } from '@/app-services/progress';
import {
  cbseChapterKeys,
  cbseClass12Curriculum,
  cbseCurriculumMeta,
  cbseCurriculumSchema,
} from './cbse-curriculum';
import cbseFixture from '../../../fixtures/cbse-class12-2026-27-curriculum.json';

describe('CBSE Class XII derived curriculum fixture', () => {
  it('validates against its schema', () => {
    expect(() => cbseCurriculumSchema.parse(cbseFixture)).not.toThrow();
  });

  it('is flagged unofficial and pending review', () => {
    expect(cbseCurriculumMeta.official).toBe(false);
    expect(cbseCurriculumMeta.needsReview).toBe(true);
    expect(cbseCurriculumMeta.kind).toBe('DERIVED_UNOFFICIAL');
  });

  it('covers the five subjects with stable, unique chapter keys', () => {
    expect(cbseClass12Curriculum.subjects.map((s) => s.key)).toEqual([
      'PHY',
      'CHE',
      'MAT',
      'CS',
      'ENG',
    ]);
    expect(new Set(cbseChapterKeys).size).toBe(cbseChapterKeys.length);
    expect(cbseChapterKeys.length).toBe(72);
  });

  it('carries no weight labelled OFFICIAL', () => {
    const sources = cbseClass12Curriculum.subjects
      .flatMap((s) => s.units ?? [])
      .flatMap((u) => u.chapters ?? [])
      .flatMap((c) => c.weights ?? [])
      .map((w) => w.sourceType);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources).not.toContain('OFFICIAL');
  });

  it('imports into a curriculum version that reads back as a full hierarchy', async () => {
    const repos = createInMemoryRepositories();
    const { versionId, counts } = await importCurriculum(repos.curriculum, cbseClass12Curriculum);
    expect(counts.subjects).toBe(5);
    expect(counts.chapters).toBe(72);

    const family = await repos.planning.createFamily({ name: 'T' });
    const student = await repos.planning.createStudent({
      familyId: family.id,
      displayName: 'S',
      board: 'CBSE',
      grade: 12,
      timezone: 'Asia/Kolkata',
    });
    const year = await repos.planning.createAcademicYear({
      studentId: student.id,
      curriculumVersionId: versionId,
      yearLabel: '2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
    });

    const progress = await getCurriculumProgress(repos, year.id);
    const keys = progress!.subjects
      .flatMap((s) => s.units)
      .flatMap((u) => u.chapters)
      .map((c) => c.key);
    expect(keys.sort()).toEqual([...cbseChapterKeys].sort());
  });
});
