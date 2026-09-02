import { addDays, eachDay } from '@/domain/planning/dates';
import type { Repositories } from '@/persistence/ports';
import { getStudentOverview } from './overview';
import { listStudySessions } from './session';
import { listUpcomingAssessments } from './assessment';

type ParentRepos = Pick<
  Repositories,
  'progress' | 'planning' | 'curriculum' | 'readiness' | 'assessment' | 'session'
>;

/**
 * The parent-facing projection (build-plan Phase 6): a read-only summary built
 * from its own shape, NOT a filtered student feed. Deliberately excludes
 * session logs, timestamps, per-chapter component scores and confidence.
 */
export interface ParentSummary {
  studentName: string;
  onTrack: boolean;
  overallReadiness: number;
  syllabusTargetDate: string;
  daysToSyllabusTarget: number;
  subjects: { name: string; readiness: number }[];
  subjectsAtRisk: number;
  needsAttention: { chapterName: string; subjectName: string; readiness: number; reason: string }[];
  /** Oldest → newest: did any study happen that day. */
  revisionDays: { date: string; studied: boolean }[];
  studiedDaysLast7: number;
  upcomingTests: { name: string; subjectName: string; examDate: string; daysUntil: number }[];
}

export async function getParentSummary(
  repos: ParentRepos,
  academicYearId: string,
  planId: string,
  studentName: string,
  asOf: string,
): Promise<ParentSummary | null> {
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  if (!overview) return null;

  const from = addDays(asOf, -6);
  const sessions = (await listStudySessions(repos, academicYearId, { from, to: asOf })) ?? [];
  const studiedDates = new Set(sessions.map((s) => s.sessionDate));
  const revisionDays = eachDay(from, asOf).map((date) => ({
    date,
    studied: studiedDates.has(date),
  }));

  const upcoming = await listUpcomingAssessments(repos, academicYearId, asOf);

  return {
    studentName,
    onTrack: overview.overallReadiness >= 55,
    overallReadiness: overview.overallReadiness,
    syllabusTargetDate: overview.syllabusTargetDate,
    daysToSyllabusTarget: overview.daysToSyllabusTarget,
    subjects: overview.subjects.map((s) => ({ name: s.name, readiness: s.readiness })),
    subjectsAtRisk: overview.subjects.filter((s) => s.readiness < 55).length,
    needsAttention: overview.needsAttention.map((c) => ({
      chapterName: c.chapterName,
      subjectName: c.subjectName,
      readiness: c.readiness,
      reason: c.reasons[0] ?? 'Below the readiness floor',
    })),
    revisionDays,
    studiedDaysLast7: revisionDays.filter((d) => d.studied).length,
    upcomingTests: upcoming.slice(0, 4).map((a) => ({
      name: a.name,
      subjectName: a.subjectName,
      examDate: a.examDate,
      daysUntil: a.daysUntil,
    })),
  };
}
