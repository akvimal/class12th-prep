import { describe, expect, it } from 'vitest';
import { seedSpecSchema, syntheticSeedSpec } from './spec';

describe('synthetic seed fixture', () => {
  it('validates against its schema', () => {
    expect(() => seedSpecSchema.parse(syntheticSeedSpec)).not.toThrow();
  });

  it('is marked as synthetic test data, never official', () => {
    expect(syntheticSeedSpec.meta.kind).toBe('SYNTHETIC_TEST_DATA');
    expect(syntheticSeedSpec.meta.official).toBe(false);
  });

  it('has stable chapter keys matching the golden fixture', () => {
    const keys = syntheticSeedSpec.curriculum.subjects
      .flatMap((s) => s.units ?? [])
      .flatMap((u) => u.chapters ?? [])
      .map((c) => c.key)
      .sort();
    expect(keys).toEqual([
      'CHE01',
      'CHE02',
      'CHE03',
      'CS01',
      'CS02',
      'CS03',
      'MAT01',
      'MAT02',
      'MAT03',
      'PHY01',
      'PHY02',
      'PHY03',
    ]);
  });

  it('carries the plan, enrollments and calendar events for the SRS scenarios', () => {
    expect(syntheticSeedSpec.plan.startDate).toBe('2026-09-02');
    expect(syntheticSeedSpec.enrollments).toHaveLength(4);
    expect(syntheticSeedSpec.calendarEvents.map((e) => e.type)).toContain('STUDY_LEAVE');
    // placeholders for later phases travel with the fixture
    expect(syntheticSeedSpec.chapterProgress).toHaveLength(12);
    expect(syntheticSeedSpec.assessments).toHaveLength(3);
  });

  it('has no derived weight labelled OFFICIAL', () => {
    const sources = syntheticSeedSpec.curriculum.subjects
      .flatMap((s) => [...(s.weights ?? []), ...(s.units ?? []).flatMap((u) => u.weights ?? [])])
      .concat(
        syntheticSeedSpec.curriculum.subjects
          .flatMap((s) => s.units ?? [])
          .flatMap((u) => u.chapters ?? [])
          .flatMap((c) => c.weights ?? []),
      )
      .map((w) => w.sourceType);
    expect(sources).not.toContain('OFFICIAL');
  });
});
