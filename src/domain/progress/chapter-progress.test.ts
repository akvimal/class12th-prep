import { describe, expect, it } from 'vitest';
import {
  assertComponentScores,
  ChapterProgressError,
  CHAPTER_STATES,
  validateComponentScores,
} from './chapter-progress';

describe('component score validation', () => {
  it('accepts integers 0..100 and an empty patch', () => {
    expect(validateComponentScores({})).toEqual([]);
    expect(validateComponentScores({ conceptScore: 0, revisionScore: 100 })).toEqual([]);
  });

  it('rejects out-of-range and non-integer scores', () => {
    expect(validateComponentScores({ testScore: -1 })[0]?.field).toBe('testScore');
    expect(validateComponentScores({ practiceScore: 101 })[0]?.field).toBe('practiceScore');
    expect(validateComponentScores({ recallScore: 40.5 })[0]?.field).toBe('recallScore');
  });

  it('assertComponentScores throws ChapterProgressError with the offending fields', () => {
    try {
      assertComponentScores({ conceptScore: 200, testScore: -5 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ChapterProgressError);
      expect((err as ChapterProgressError).violations.map((v) => v.field).sort()).toEqual([
        'conceptScore',
        'testScore',
      ]);
    }
  });
});

describe('chapter states', () => {
  it('are the SRS §7 sequence', () => {
    expect(CHAPTER_STATES).toEqual([
      'NOT_STARTED',
      'LEARNING',
      'LEARNED',
      'PRACTISED',
      'TESTED',
      'REVISED',
      'EXAM_READY',
    ]);
  });
});
