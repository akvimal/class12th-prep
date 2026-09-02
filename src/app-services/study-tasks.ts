import type { DailyPlan } from '@/domain/planning/daily-planner';
import { addDays } from '@/domain/planning/dates';
import { resolveTaskStatus } from '@/domain/planning/study-task';
import type { NewStudyTask, Repositories } from '@/persistence/ports';
import { getCurriculumProgress } from './progress';

type StudyTaskRepos = Pick<
  Repositories,
  'studyTask' | 'session' | 'progress' | 'planning' | 'curriculum'
>;

/** chapterKey → the ids the study_tasks table needs. */
async function chapterRefs(
  repos: StudyTaskRepos,
  academicYearId: string,
): Promise<Map<string, { chapterId: string; subjectId: string }>> {
  const progress = await getCurriculumProgress(repos, academicYearId);
  const map = new Map<string, { chapterId: string; subjectId: string }>();
  for (const subject of progress?.subjects ?? []) {
    for (const unit of subject.units) {
      for (const chapter of unit.chapters) {
        map.set(chapter.key, { chapterId: chapter.id, subjectId: subject.id });
      }
    }
  }
  return map;
}

/**
 * Persist a day's plan as StudyTask rows (idempotent — regenerates in place).
 * `plan.asOf` is the planned date. Primary cards and optional extras are both
 * stored, tagged by slot.
 */
export async function persistDailyPlan(
  repos: StudyTaskRepos,
  academicYearId: string,
  plan: DailyPlan,
): Promise<void> {
  const refs = await chapterRefs(repos, academicYearId);

  const rows: NewStudyTask[] = [];
  const add = (tasks: DailyPlan['primary'], slot: 'PRIMARY' | 'OPTIONAL') => {
    for (const t of tasks) {
      const ref = refs.get(t.candidate.chapterKey);
      if (!ref) continue;
      rows.push({
        chapterId: ref.chapterId,
        subjectId: ref.subjectId,
        plannedDate: plan.asOf,
        activity: t.candidate.activity,
        plannedMinutes: t.minutes,
        slot,
        reasonCodes: t.reasons,
        priorityScore: t.score,
        algorithmVersion: plan.algorithmVersion,
      });
    }
  };
  add(plan.primary, 'PRIMARY');
  add(plan.optional, 'OPTIONAL');

  await repos.studyTask.saveDailyPlan(academicYearId, plan.asOf, rows);
}

export interface ReconcileResult {
  completed: number;
  missed: number;
}

/**
 * Look back at every still-SCHEDULED task whose day has passed and resolve it:
 * COMPLETED if a study session for that chapter landed on or after the planned
 * date, otherwise MISSED. Missed tasks are not re-created for today — their
 * chapter's missed count raises its priority instead (docs/ALGORITHMS.md §6).
 */
export async function reconcilePastTasks(
  repos: StudyTaskRepos,
  academicYearId: string,
  asOf: string,
): Promise<ReconcileResult> {
  const open = await repos.studyTask.listTasks(academicYearId, {
    status: 'SCHEDULED',
    to: addDays(asOf, -1),
  });
  if (open.length === 0) return { completed: 0, missed: 0 };

  const earliest = open.reduce(
    (min, t) => (t.plannedDate < min ? t.plannedDate : min),
    open[0]!.plannedDate,
  );
  const sessions = await repos.session.listSessions(academicYearId, {
    from: earliest,
    to: addDays(asOf, -1),
  });

  let completed = 0;
  let missed = 0;
  for (const task of open) {
    const match = sessions.find(
      (s) => s.chapterId === task.chapterId && s.sessionDate >= task.plannedDate,
    );
    const status = resolveTaskStatus({
      plannedDate: task.plannedDate,
      asOf,
      hadQualifyingSession: Boolean(match),
    });
    if (!status) continue;
    await repos.studyTask.resolve(task.id, status, {
      sourceSessionId: match?.id ?? null,
      resolvedAt: asOf,
    });
    if (status === 'COMPLETED') completed += 1;
    else missed += 1;
  }
  return { completed, missed };
}

/**
 * When a session is logged for a chapter, close any open task for that chapter
 * on or before the session date (same-day completion — reconciliation only
 * runs once the day has passed).
 */
export async function resolveTasksForSession(
  repos: Pick<Repositories, 'studyTask'>,
  academicYearId: string,
  chapterId: string,
  on: string,
  sessionId: string,
): Promise<void> {
  const open = await repos.studyTask.listTasks(academicYearId, {
    status: 'SCHEDULED',
    chapterId,
    to: on,
  });
  for (const task of open) {
    await repos.studyTask.resolve(task.id, 'COMPLETED', {
      sourceSessionId: sessionId,
      resolvedAt: on,
    });
  }
}
