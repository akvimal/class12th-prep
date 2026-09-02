import { revisionV1 } from '@/config/revision';
import { daysBetween } from '@/domain/planning/dates';
import {
  firstRevision,
  nextRevision,
  revisionDueState,
  type RevisionOutcome,
} from '@/domain/revision/revision';
import type { Repositories, RevisionScheduleRecord } from '@/persistence/ports';
import { getCurriculumProgress } from './progress';

type RevisionRepos = Pick<Repositories, 'revision' | 'planning' | 'curriculum' | 'progress'>;

/** Chapter states from which spaced revision makes sense. */
const REVISABLE_STATES = new Set(['LEARNED', 'PRACTISED', 'TESTED', 'REVISED', 'EXAM_READY']);

/**
 * Ensure a chapter that has reached at least LEARNED has a scheduled first
 * revision. Idempotent — does nothing if one is already active or the chapter
 * is not revisable yet.
 */
export async function ensureRevisionScheduled(
  repos: RevisionRepos,
  academicYearId: string,
  chapterId: string,
  fromDate: string,
  chapterState: string,
): Promise<RevisionScheduleRecord | null> {
  if (!REVISABLE_STATES.has(chapterState)) return null;
  if (await repos.revision.getActive(academicYearId, chapterId)) return null;

  const first = firstRevision(fromDate, revisionV1);
  return repos.revision.schedule({
    academicYearId,
    chapterId,
    revisionNumber: first.revisionNumber,
    dueDate: first.dueDate,
    method: first.method,
    algorithmVersion: revisionV1.version,
  });
}

/**
 * Record the outcome of a revision done on `doneOn`: close the active schedule
 * and append the next one per the revision engine. If nothing was scheduled,
 * treat `doneOn` as the learning point and schedule from there.
 */
export async function recordRevisionOutcome(
  repos: RevisionRepos,
  academicYearId: string,
  chapterId: string,
  outcome: RevisionOutcome,
  doneOn: string,
  sourceSessionId?: string | null,
): Promise<RevisionScheduleRecord> {
  const active = await repos.revision.getActive(academicYearId, chapterId);

  if (!active) {
    const first = firstRevision(doneOn, revisionV1);
    return repos.revision.schedule({
      academicYearId,
      chapterId,
      revisionNumber: first.revisionNumber,
      dueDate: first.dueDate,
      method: first.method,
      algorithmVersion: revisionV1.version,
    });
  }

  await repos.revision.complete(active.id, { outcome, completedOn: doneOn, sourceSessionId });

  const next = nextRevision(active.revisionNumber, outcome, doneOn, revisionV1);
  return repos.revision.schedule({
    academicYearId,
    chapterId,
    revisionNumber: next.revisionNumber,
    dueDate: next.dueDate,
    method: next.method,
    algorithmVersion: revisionV1.version,
  });
}

/** The revision-due signal for one chapter (feeds the planner's priority). */
export async function revisionStateForChapter(
  repos: Pick<Repositories, 'revision'>,
  academicYearId: string,
  chapterId: string,
  asOf: string,
): Promise<'NONE' | 'DUE_TODAY' | 'OVERDUE'> {
  const active = await repos.revision.getActive(academicYearId, chapterId);
  return active ? revisionDueState(active.dueDate, asOf) : 'NONE';
}

export interface RevisionQueueItem {
  scheduleId: string;
  chapterKey: string;
  chapterName: string;
  subjectKey: string;
  subjectName: string;
  revisionNumber: number;
  method: string;
  dueDate: string;
  daysUntil: number;
}

export interface RevisionQueue {
  overdue: RevisionQueueItem[];
  dueToday: RevisionQueueItem[];
  upcoming: RevisionQueueItem[];
  completedCount: number;
}

/** Grouped revision queue for the /revision screen. */
export async function getRevisionQueue(
  repos: RevisionRepos,
  academicYearId: string,
  asOf: string,
): Promise<RevisionQueue | null> {
  const tree = await getCurriculumProgress(repos, academicYearId);
  if (!tree) return null;

  const chapterMeta = new Map(
    tree.subjects.flatMap((s) =>
      s.units.flatMap((u) =>
        u.chapters.map((c) => [
          c.id,
          { chapterKey: c.key, chapterName: c.name, subjectKey: s.key, subjectName: s.name },
        ]),
      ),
    ),
  );

  const scheduled = await repos.revision.listSchedules(academicYearId, { status: 'SCHEDULED' });
  const completed = await repos.revision.listSchedules(academicYearId, { status: 'DONE' });

  const toItem = (r: RevisionScheduleRecord): RevisionQueueItem => {
    const m = chapterMeta.get(r.chapterId);
    return {
      scheduleId: r.id,
      chapterKey: m?.chapterKey ?? r.chapterId,
      chapterName: m?.chapterName ?? r.chapterId,
      subjectKey: m?.subjectKey ?? '',
      subjectName: m?.subjectName ?? '',
      revisionNumber: r.revisionNumber,
      method: r.method,
      dueDate: r.dueDate,
      daysUntil: daysBetween(asOf, r.dueDate),
    };
  };

  const items = scheduled.map(toItem);
  return {
    overdue: items.filter((i) => i.daysUntil < 0),
    dueToday: items.filter((i) => i.daysUntil === 0),
    upcoming: items.filter((i) => i.daysUntil > 0).slice(0, 6),
    completedCount: completed.length,
  };
}
