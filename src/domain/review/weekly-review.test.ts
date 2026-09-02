import { describe, expect, it } from 'vitest';
import { reviewV1 } from '@/config/review';
import { buildWeeklyReview, type WeeklyReviewInput } from './weekly-review';

const base: WeeklyReviewInput = {
  weekStart: '2026-08-26',
  weekEnd: '2026-09-01',
  sessions: [
    { type: 'LEARN', actualMinutes: 40, completion: 'YES', attempted: null, correct: null },
    { type: 'PRACTISE', actualMinutes: 50, completion: 'YES', attempted: 20, correct: 15 },
    { type: 'PRACTISE', actualMinutes: 30, completion: 'PARTIAL', attempted: 10, correct: 4 },
  ],
  rhythm: { plannedDays: 6, metDays: 4, adherenceRate: 0.67 },
  readiness: [
    { subjectKey: 'PHY', subjectName: 'Physics', from: 40, to: 48 },
    { subjectKey: 'MAT', subjectName: 'Maths', from: 55, to: 52 },
  ],
  revisionsDone: 2,
  errorsLogged: 3,
  focusCandidates: [
    { subjectKey: 'PHY', chapterKey: 'PHY03', chapterName: 'Ray Optics', readiness: 30 },
    { subjectKey: 'MAT', chapterKey: 'MAT07', chapterName: 'Integrals', readiness: 44 },
    { subjectKey: 'CHE', chapterKey: 'CHE02', chapterName: 'Solutions', readiness: 58 },
  ],
};

describe('buildWeeklyReview', () => {
  it('aggregates sessions, time-by-activity and accuracy', () => {
    const r = buildWeeklyReview(base, reviewV1);
    expect(r.sessionsLogged).toBe(3);
    expect(r.minutesLogged).toBe(120);
    expect(r.fullCompletions).toBe(2);
    expect(r.timeByActivity).toEqual({ LEARN: 40, PRACTISE: 80 });
    expect(r.accuracyPct).toBe(63); // 19 / 30
  });

  it('null accuracy when nothing was attempted', () => {
    const r = buildWeeklyReview({ ...base, sessions: [base.sessions[0]!] }, reviewV1);
    expect(r.accuracyPct).toBeNull();
  });

  it('readiness movement is signed and sorted worst-first', () => {
    const r = buildWeeklyReview(base, reviewV1);
    expect(r.readinessMovement.map((m) => m.subjectKey)).toEqual(['MAT', 'PHY']);
    expect(r.readinessMovement[0]!.delta).toBe(-3);
    expect(r.readinessMovement[1]!.delta).toBe(8);
  });

  it('focus list drops chapters at/above the readiness ceiling and caps the count', () => {
    const r = buildWeeklyReview(base, reviewV1);
    expect(r.focusNext.map((c) => c.chapterKey)).toEqual(['PHY03', 'MAT07']); // CHE02 at 58 ≥ 55
  });

  it('carries the config version', () => {
    expect(buildWeeklyReview(base, reviewV1).algorithmVersion).toBe('review-v1');
  });
});
