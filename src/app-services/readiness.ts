import { readinessV1 } from '@/config/readiness';
import { computeReadiness, type ReadinessResult } from '@/domain/readiness/readiness';
import type { ReadinessSnapshotRecord, Repositories } from '@/persistence/ports';

type WithReadiness = Pick<Repositories, 'readiness' | 'progress' | 'planning'>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ChapterReadiness {
  chapterId: string;
  result: ReadinessResult;
  snapshotId: string | null;
}

/**
 * Compute a chapter's readiness from its progress components. By default it
 * appends an immutable snapshot and refreshes the cached `effectiveReadiness`
 * on the progress row. Recalculation never rewrites history.
 * Returns null if the chapter has no progress record.
 */
export async function calculateChapterReadiness(
  repos: WithReadiness,
  academicYearId: string,
  chapterId: string,
  opts: { asOf?: string; persist?: boolean } = {},
): Promise<ChapterReadiness | null> {
  const progress = await repos.progress.getChapterProgress(academicYearId, chapterId);
  if (!progress) return null;

  const asOf = opts.asOf ?? today();
  const result = computeReadiness(
    {
      conceptScore: progress.conceptScore,
      practiceScore: progress.practiceScore,
      testScore: progress.testScore,
      recallScore: progress.recallScore,
      revisionScore: progress.revisionScore,
      lastRevisedOn: progress.lastRevisedAt ? progress.lastRevisedAt.slice(0, 10) : null,
      asOf,
    },
    readinessV1,
  );

  let snapshotId: string | null = null;
  if (opts.persist !== false) {
    const snapshot = await repos.readiness.createSnapshot({
      academicYearId,
      scopeType: 'CHAPTER',
      scopeId: chapterId,
      readiness: result.effective,
      raw: result.raw,
      recencyFactor: result.recencyFactor,
      components: result.components,
      algorithmVersion: result.algorithmVersion,
      calculatedFor: asOf,
    });
    snapshotId = snapshot.id;
    await repos.progress.setChapterProgress(academicYearId, chapterId, {
      effectiveReadiness: result.effective,
    });
  }

  return { chapterId, result, snapshotId };
}

export interface RecalculationSummary {
  academicYearId: string;
  chaptersProcessed: number;
  algorithmVersion: string;
  calculatedFor: string;
}

/** Recompute and snapshot readiness for every chapter that has a progress record. */
export async function recalculateAcademicYearReadiness(
  repos: WithReadiness,
  academicYearId: string,
  opts: { asOf?: string } = {},
): Promise<RecalculationSummary | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  const asOf = opts.asOf ?? today();
  const progressRecords = await repos.progress.listChapterProgress(academicYearId);
  for (const record of progressRecords) {
    await calculateChapterReadiness(repos, academicYearId, record.chapterId, {
      asOf,
      persist: true,
    });
  }

  return {
    academicYearId,
    chaptersProcessed: progressRecords.length,
    algorithmVersion: readinessV1.version,
    calculatedFor: asOf,
  };
}

export interface ChapterReadinessView {
  chapterId: string;
  latest: ReadinessSnapshotRecord | null;
  history: ReadinessSnapshotRecord[];
}

export async function getChapterReadiness(
  repos: WithReadiness,
  academicYearId: string,
  chapterId: string,
  historyLimit = 10,
): Promise<ChapterReadinessView | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  const [latest, history] = await Promise.all([
    repos.readiness.getLatestSnapshot(academicYearId, 'CHAPTER', chapterId),
    repos.readiness.listSnapshots(academicYearId, {
      scopeType: 'CHAPTER',
      scopeId: chapterId,
      limit: historyLimit,
    }),
  ]);
  return { chapterId, latest, history };
}

/** The most recent chapter snapshot for each chapter in the academic year. */
export async function getAcademicYearReadiness(
  repos: WithReadiness,
  academicYearId: string,
): Promise<ReadinessSnapshotRecord[] | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;
  return repos.readiness.latestByScope(academicYearId, 'CHAPTER');
}

export interface ReadinessTrendPoint {
  on: string;
  readiness: number;
}

/**
 * Mean chapter readiness on each date a snapshot was calculated for — a coarse
 * "readiness over time" series for the trajectory chart. Only dates with at
 * least `minChapters` snapshots are kept so a single-chapter recalc doesn't
 * make a spike.
 */
export async function getReadinessTrend(
  repos: WithReadiness,
  academicYearId: string,
  minChapters = 2,
): Promise<ReadinessTrendPoint[]> {
  const snapshots = await repos.readiness.listSnapshots(academicYearId, { scopeType: 'CHAPTER' });
  const byDate = new Map<string, number[]>();
  for (const s of snapshots) {
    const list = byDate.get(s.calculatedFor) ?? [];
    list.push(s.readiness);
    byDate.set(s.calculatedFor, list);
  }
  return [...byDate.entries()]
    .filter(([, values]) => values.length >= minChapters)
    .map(([on, values]) => ({
      on,
      readiness: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    }))
    .sort((a, b) => (a.on < b.on ? -1 : 1));
}
