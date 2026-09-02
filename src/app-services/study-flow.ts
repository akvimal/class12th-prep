import { isRevisionSession } from '@/domain/progress/study-session';
import type { ChapterProgressPatch } from '@/persistence/ports';
import type { ReadinessResult } from '@/domain/readiness/readiness';
import { chapterIdForKey, setChapterProgress } from './progress';
import { calculateChapterReadiness } from './readiness';
import { recordStudySession, type RecordSessionInput } from './session';
import type { Repositories } from '@/persistence/ports';

type FlowRepos = Pick<
  Repositories,
  'session' | 'planning' | 'curriculum' | 'progress' | 'readiness'
>;

export interface LogStudyResult {
  sessionId: string;
  chapterId: string | null;
  readiness: ReadinessResult | null;
}

/**
 * Record a study session and refresh what it legitimately affects — nothing
 * more. The session itself is immutable evidence (`recordStudySession` never
 * touches progress). This orchestrator then, for a chapter-scoped session:
 *   - stamps `lastStudiedAt` (and `lastRevisedAt` for retrieval/testing work),
 *   - recomputes and snapshots the chapter's readiness (recency may have moved).
 * It does NOT infer component scores or advance chapter state — that stays an
 * explicit self-assessment (see {@link updateChapterSelfAssessment}).
 */
export async function logStudy(
  repos: FlowRepos,
  academicYearId: string,
  input: RecordSessionInput,
): Promise<LogStudyResult | null> {
  const session = await recordStudySession(repos, academicYearId, input);
  if (!session) return null;

  const chapterId =
    session.chapterId ??
    (input.chapterKey ? await chapterIdForKey(repos, academicYearId, input.chapterKey) : null);

  if (!chapterId) {
    return { sessionId: session.id, chapterId: null, readiness: null };
  }

  const on = input.sessionDate ?? new Date().toISOString().slice(0, 10);
  const patch: ChapterProgressPatch = { lastStudiedAt: on };
  if (isRevisionSession(input.type)) patch.lastRevisedAt = on;
  await setChapterProgress(repos, academicYearId, chapterId, patch);

  const readiness = await calculateChapterReadiness(repos, academicYearId, chapterId, { asOf: on });
  return { sessionId: session.id, chapterId, readiness: readiness?.result ?? null };
}

/**
 * Apply an explicit self-assessment to a chapter (school status, confidence,
 * the five component scores, state) and recompute its readiness. Component
 * score ranges are validated by `setChapterProgress`.
 */
export async function updateChapterSelfAssessment(
  repos: FlowRepos,
  academicYearId: string,
  chapterId: string,
  patch: ChapterProgressPatch,
  asOf: string = new Date().toISOString().slice(0, 10),
): Promise<ReadinessResult | null> {
  await setChapterProgress(repos, academicYearId, chapterId, patch);
  const readiness = await calculateChapterReadiness(repos, academicYearId, chapterId, { asOf });
  return readiness?.result ?? null;
}
