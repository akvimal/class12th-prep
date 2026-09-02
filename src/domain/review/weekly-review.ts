import type { ReviewConfig } from '@/config/review';

export interface WeeklyReviewSession {
  type: string;
  actualMinutes: number;
  completion: string;
  attempted: number | null;
  correct: number | null;
}

export interface WeeklyReviewReadiness {
  subjectKey: string;
  subjectName: string;
  from: number;
  to: number;
}

export interface WeeklyReviewFocusCandidate {
  subjectKey: string;
  chapterKey: string;
  chapterName: string;
  readiness: number;
}

export interface WeeklyReviewInput {
  weekStart: string;
  weekEnd: string;
  sessions: WeeklyReviewSession[];
  rhythm: { plannedDays: number; metDays: number; adherenceRate: number } | null;
  readiness: WeeklyReviewReadiness[];
  revisionsDone: number;
  errorsLogged: number;
  /** Sorted ascending by readiness — the weakest in-play chapters. */
  focusCandidates: WeeklyReviewFocusCandidate[];
}

export interface WeeklyReviewMovement extends WeeklyReviewReadiness {
  delta: number;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  sessionsLogged: number;
  minutesLogged: number;
  fullCompletions: number;
  plannedDays: number;
  metDays: number;
  adherenceRate: number;
  accuracyPct: number | null;
  timeByActivity: Record<string, number>;
  readinessMovement: WeeklyReviewMovement[];
  revisionsDone: number;
  errorsLogged: number;
  focusNext: WeeklyReviewFocusCandidate[];
  algorithmVersion: string;
}

/**
 * Deterministically summarise one study week (docs/DOMAIN_MODEL.md
 * `WeeklyReview`). Pure — the same inputs and config always produce the same
 * review, so a stored review can be compared to a later re-derivation.
 */
export function buildWeeklyReview(input: WeeklyReviewInput, config: ReviewConfig): WeeklyReview {
  const minutesLogged = input.sessions.reduce((a, s) => a + s.actualMinutes, 0);
  const fullCompletions = input.sessions.filter((s) => s.completion === 'YES').length;

  const attempted = input.sessions.reduce((a, s) => a + (s.attempted ?? 0), 0);
  const correct = input.sessions.reduce((a, s) => a + (s.correct ?? 0), 0);

  const timeByActivity: Record<string, number> = {};
  for (const s of input.sessions) {
    timeByActivity[s.type] = (timeByActivity[s.type] ?? 0) + s.actualMinutes;
  }

  const readinessMovement = input.readiness
    .map((r) => ({ ...r, delta: Math.round((r.to - r.from) * 10) / 10 }))
    .sort((a, b) => a.delta - b.delta);

  const focusNext = input.focusCandidates
    .filter((c) => c.readiness < config.readinessFocusCeiling)
    .slice(0, config.focusChapterCount);

  return {
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    sessionsLogged: input.sessions.length,
    minutesLogged,
    fullCompletions,
    plannedDays: input.rhythm?.plannedDays ?? 0,
    metDays: input.rhythm?.metDays ?? 0,
    adherenceRate: input.rhythm?.adherenceRate ?? 0,
    accuracyPct: attempted > 0 ? Math.round((correct / attempted) * 100) : null,
    timeByActivity,
    readinessMovement,
    revisionsDone: input.revisionsDone,
    errorsLogged: input.errorsLogged,
    focusNext,
    algorithmVersion: config.version,
  };
}
