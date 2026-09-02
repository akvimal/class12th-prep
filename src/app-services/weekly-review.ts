import { reviewV1 } from '@/config/review';
import { addDays } from '@/domain/planning/dates';
import {
  buildWeeklyReview,
  type WeeklyReview,
  type WeeklyReviewFocusCandidate,
  type WeeklyReviewReadiness,
} from '@/domain/review/weekly-review';
import type { Repositories } from '@/persistence/ports';
import { emitEvent } from './events';
import { getCurriculumProgress } from './progress';
import { getWeeklyRhythm } from './study-windows';

type WeeklyReviewRepos = Pick<
  Repositories,
  | 'weeklyReview'
  | 'planning'
  | 'curriculum'
  | 'progress'
  | 'readiness'
  | 'session'
  | 'studyWindow'
  | 'revision'
  | 'assessmentResult'
  | 'events'
>;

function inWindow(iso: string | null, start: string, end: string): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= start && day <= end;
}

/**
 * Build and persist the review for the week ending on `asOf` (exclusive of
 * `asOf` itself — it covers `[asOf − weekLengthDays, asOf − 1]`). Idempotent:
 * the row is overwritten and the `WEEKLY_REVIEW_READY` event is deduped per
 * week. Returns null when the academic year is missing.
 */
export async function generateWeeklyReview(
  repos: WeeklyReviewRepos,
  academicYearId: string,
  asOf: string,
  opts: { announce?: boolean; config?: typeof reviewV1 } = {},
): Promise<WeeklyReview | null> {
  const config = opts.config ?? reviewV1;
  const announce = opts.announce ?? true;
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  const weekStart = addDays(asOf, -config.weekLengthDays);
  const weekEnd = addDays(asOf, -1);

  const [progress, rhythm, subjectSnapshots, revisions, errors] = await Promise.all([
    getCurriculumProgress(repos, academicYearId),
    getWeeklyRhythm(repos, academicYearId, weekEnd, config.weekLengthDays),
    repos.readiness.listSnapshots(academicYearId, { scopeType: 'SUBJECT' }),
    repos.revision.listSchedules(academicYearId, { status: 'DONE' }),
    repos.assessmentResult.listErrors(academicYearId),
  ]);

  const sessions = (
    await repos.session.listSessions(academicYearId, { from: weekStart, to: weekEnd })
  ).map((s) => ({
    type: s.type,
    actualMinutes: s.actualMinutes,
    completion: s.completion,
    attempted: s.attempted,
    correct: s.correct,
  }));

  // Readiness movement per subject: newest snapshot vs. the last one at/before
  // the start of the week.
  const readiness: WeeklyReviewReadiness[] = [];
  const focusCandidates: WeeklyReviewFocusCandidate[] = [];
  for (const subject of progress?.subjects ?? []) {
    const history = subjectSnapshots
      .filter((s) => s.scopeId === subject.id)
      .sort((a, b) => (a.calculatedFor > b.calculatedFor ? -1 : 1));
    if (history.length > 0) {
      const to = history[0]!.readiness;
      const prior = history.find((s) => s.calculatedFor <= weekStart) ?? history.at(-1)!;
      readiness.push({
        subjectKey: subject.key,
        subjectName: subject.name,
        from: prior.readiness,
        to,
      });
    }
    for (const unit of subject.units) {
      for (const chapter of unit.chapters) {
        const r = chapter.progress.effectiveReadiness;
        if (r == null || chapter.progress.state === 'EXAM_READY') continue;
        focusCandidates.push({
          subjectKey: subject.key,
          chapterKey: chapter.key,
          chapterName: chapter.name,
          readiness: Math.round(r),
        });
      }
    }
  }
  focusCandidates.sort((a, b) => a.readiness - b.readiness);

  const summary = buildWeeklyReview(
    {
      weekStart,
      weekEnd,
      sessions,
      rhythm: rhythm
        ? {
            plannedDays: rhythm.plannedDays,
            metDays: rhythm.metDays,
            adherenceRate: rhythm.adherenceRate,
          }
        : null,
      readiness,
      revisionsDone: revisions.filter((r) => inWindow(r.completedOn, weekStart, weekEnd)).length,
      errorsLogged: errors.filter((e) => inWindow(e.createdAt, weekStart, weekEnd)).length,
      focusCandidates,
    },
    config,
  );

  await repos.weeklyReview.upsert(academicYearId, weekStart, weekEnd, summary);

  if (announce) {
    await emitEvent(repos, {
      studentId: year.studentId,
      eventType: 'WEEKLY_REVIEW_READY',
      aggregateType: 'academicYear',
      aggregateId: academicYearId,
      on: weekStart,
      payload: { weekStart, weekEnd, sessionsLogged: summary.sessionsLogged },
    });
  }

  return summary;
}

/** The most recent stored weekly review, or null. */
export async function getLatestWeeklyReview(
  repos: Pick<Repositories, 'weeklyReview'>,
  academicYearId: string,
): Promise<WeeklyReview | null> {
  const [row] = await repos.weeklyReview.list(academicYearId, { limit: 1 });
  return row?.summary ?? null;
}
