import { describe, expect, it } from 'vitest';
import {
  assertSession,
  StudySessionError,
  STUDY_SESSION_TYPES,
  validateSession,
} from './study-session';

describe('validateSession', () => {
  it('accepts a plain completed session', () => {
    expect(validateSession({ actualMinutes: 40 })).toEqual([]);
  });

  it('rejects negative or non-integer actual minutes', () => {
    expect(validateSession({ actualMinutes: -1 })[0]?.field).toBe('actualMinutes');
    expect(validateSession({ actualMinutes: 12.5 })[0]?.field).toBe('actualMinutes');
  });

  it('rejects negative planned minutes / attempted', () => {
    expect(validateSession({ actualMinutes: 10, plannedMinutes: -5 })[0]?.field).toBe(
      'plannedMinutes',
    );
    expect(validateSession({ actualMinutes: 10, attempted: -1 })[0]?.field).toBe('attempted');
  });

  it('rejects correct greater than attempted', () => {
    expect(validateSession({ actualMinutes: 10, attempted: 5, correct: 8 })[0]?.message).toContain(
      'exceed attempted',
    );
    expect(validateSession({ actualMinutes: 10, attempted: 8, correct: 5 })).toEqual([]);
    // correct with no attempted is allowed
    expect(validateSession({ actualMinutes: 10, correct: 3 })).toEqual([]);
  });

  it('rejects an end time before the start time', () => {
    expect(
      validateSession({
        actualMinutes: 10,
        startedAt: '2026-09-02T18:30:00Z',
        endedAt: '2026-09-02T18:00:00Z',
      })[0]?.field,
    ).toBe('endedAt');
  });
});

describe('assertSession', () => {
  it('throws StudySessionError carrying every violation', () => {
    try {
      assertSession({ actualMinutes: -1, attempted: 2, correct: 5 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(StudySessionError);
      expect((err as StudySessionError).violations.length).toBe(2);
    }
  });
});

describe('session types', () => {
  it('include every type from the task spec', () => {
    expect(STUDY_SESSION_TYPES).toContain('ACTIVE_RECALL');
    expect(STUDY_SESSION_TYPES).toContain('FULL_PAPER');
    expect(STUDY_SESSION_TYPES).toHaveLength(11);
  });
});
