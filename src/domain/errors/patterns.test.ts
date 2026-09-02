import { describe, expect, it } from 'vitest';
import { errorPatternsV1 } from '@/config/error-patterns';
import { detectErrorPatterns, type ErrorObservation } from './patterns';

const obs = (over: Partial<ErrorObservation> = {}): ErrorObservation => ({
  subjectId: 'phy',
  chapterId: 'phy01',
  errorType: 'CALCULATION',
  marksLost: 3,
  on: '2026-09-01',
  ...over,
});

describe('detectErrorPatterns', () => {
  it('flags the same error type recurring in one chapter', () => {
    const patterns = detectErrorPatterns(
      [obs({ on: '2026-09-01' }), obs({ on: '2026-09-08' })],
      errorPatternsV1,
    );
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      scope: 'CHAPTER',
      errorType: 'CALCULATION',
      chapterId: 'phy01',
      occurrences: 2,
      marksLost: 6,
      firstSeen: '2026-09-01',
      lastSeen: '2026-09-08',
      knowledgeGap: false,
    });
  });

  it('does not flag a single occurrence, or one below the marks-lost floor', () => {
    expect(detectErrorPatterns([obs()], errorPatternsV1)).toEqual([]);
    expect(
      detectErrorPatterns([obs({ marksLost: 1 }), obs({ marksLost: 1 })], errorPatternsV1),
    ).toEqual([]);
  });

  it('flags a subject-level pattern only when it spans ≥ 2 chapters', () => {
    // 3 CONCEPT errors, all in phy01 → chapter pattern only
    const oneChapter = detectErrorPatterns(
      [
        obs({ errorType: 'CONCEPT', chapterId: 'phy01' }),
        obs({ errorType: 'CONCEPT', chapterId: 'phy01' }),
        obs({ errorType: 'CONCEPT', chapterId: 'phy01' }),
      ],
      errorPatternsV1,
    );
    expect(oneChapter.map((p) => p.scope)).toEqual(['CHAPTER']);

    // 3 CONCEPT errors across phy01/phy02/phy03 → subject pattern
    const acrossChapters = detectErrorPatterns(
      [
        obs({ errorType: 'CONCEPT', chapterId: 'phy01' }),
        obs({ errorType: 'CONCEPT', chapterId: 'phy02' }),
        obs({ errorType: 'CONCEPT', chapterId: 'phy03' }),
      ],
      errorPatternsV1,
    );
    expect(acrossChapters.map((p) => p.scope)).toContain('SUBJECT');
    const subjectPattern = acrossChapters.find((p) => p.scope === 'SUBJECT')!;
    expect(subjectPattern.chapterId).toBeNull();
    expect(subjectPattern.knowledgeGap).toBe(true);
  });

  it('sorts by marks lost, biggest first, and is version-stamped', () => {
    const patterns = detectErrorPatterns(
      [
        obs({ errorType: 'CALCULATION', chapterId: 'phy01', marksLost: 2 }),
        obs({ errorType: 'CALCULATION', chapterId: 'phy01', marksLost: 3 }),
        obs({ errorType: 'MEMORY', chapterId: 'phy02', marksLost: 10 }),
        obs({ errorType: 'MEMORY', chapterId: 'phy02', marksLost: 10 }),
      ],
      errorPatternsV1,
    );
    expect(patterns[0]!.errorType).toBe('MEMORY');
    expect(patterns.every((p) => p.algorithmVersion === 'error-patterns-v1')).toBe(true);
  });
});
