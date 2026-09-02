import type { SessionCompletion, StudySessionType } from '@/domain/progress/study-session';
import { assertSession } from '@/domain/progress/study-session';
import type { ConfidenceLevel } from '@/domain/progress/chapter-progress';
import type { Repositories, SessionFilters, StudySessionRecord } from '@/persistence/ports';

type WithSession = Pick<Repositories, 'session' | 'planning' | 'curriculum'>;

export interface RecordSessionInput {
  type: StudySessionType;
  completion: SessionCompletion;
  /** Either a stable key ("PHY01" / "PHY") or an id may be given for the context. */
  chapterKey?: string;
  chapterId?: string;
  subjectKey?: string;
  subjectId?: string;
  studyTaskId?: string | null;
  sessionDate?: string;
  plannedMinutes?: number | null;
  actualMinutes: number;
  attempted?: number | null;
  correct?: number | null;
  confidenceAfter?: ConfidenceLevel | null;
  startedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function context(repos: WithSession, academicYearId: string) {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;
  if (!year.curriculumVersionId) {
    return {
      yearExists: true,
      chapters: new Map(),
      subjectsById: new Map(),
      subjectsByKey: new Map(),
    };
  }
  const hierarchy = await repos.curriculum.getHierarchy(year.curriculumVersionId);
  const chapters = new Map<string, { chapterId: string; subjectId: string }>();
  const subjectsByKey = new Map<string, string>();
  const subjectsById = new Set<string>();
  for (const s of hierarchy) {
    subjectsByKey.set(s.key, s.id);
    subjectsById.add(s.id);
    for (const u of s.units) {
      for (const c of u.chapters) {
        chapters.set(c.key, { chapterId: c.id, subjectId: s.id });
        chapters.set(c.id, { chapterId: c.id, subjectId: s.id });
      }
    }
  }
  return { yearExists: true, chapters, subjectsById, subjectsByKey };
}

/**
 * Append an immutable study session. Recording it never changes chapter state.
 * Returns null when the academic year does not exist.
 */
export async function recordStudySession(
  repos: WithSession,
  academicYearId: string,
  input: RecordSessionInput,
): Promise<StudySessionRecord | null> {
  assertSession(input);

  const ctx = await context(repos, academicYearId);
  if (!ctx) return null;

  let chapterId = input.chapterId ?? null;
  let subjectId = input.subjectId ?? null;

  const chapterRef = input.chapterKey ?? input.chapterId;
  if (chapterRef) {
    const resolved = ctx.chapters.get(chapterRef);
    if (!resolved)
      throw new Error(`chapter "${chapterRef}" is not in this academic year's curriculum`);
    chapterId = resolved.chapterId;
    subjectId = subjectId ?? resolved.subjectId;
  }
  if (!subjectId && input.subjectKey) {
    subjectId = ctx.subjectsByKey.get(input.subjectKey) ?? null;
    if (!subjectId) throw new Error(`subject "${input.subjectKey}" is not in this curriculum`);
  }

  return repos.session.recordSession({
    academicYearId,
    chapterId,
    subjectId,
    studyTaskId: input.studyTaskId ?? null,
    type: input.type,
    completion: input.completion,
    sessionDate: input.sessionDate ?? todayIso(),
    plannedMinutes: input.plannedMinutes ?? null,
    actualMinutes: input.actualMinutes,
    attempted: input.attempted ?? null,
    correct: input.correct ?? null,
    confidenceAfter: input.confidenceAfter ?? null,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    notes: input.notes ?? null,
  });
}

export async function listStudySessions(
  repos: WithSession,
  academicYearId: string,
  filters?: SessionFilters,
): Promise<StudySessionRecord[] | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;
  return repos.session.listSessions(academicYearId, filters);
}
