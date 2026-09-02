import { pickStudyNow, type StudyNowResult } from '@/domain/planning/study-now';
import type { Repositories } from '@/persistence/ports';
import { buildDailyCandidates } from './candidates';

type StudyNowRepos = Pick<
  Repositories,
  'progress' | 'planning' | 'curriculum' | 'readiness' | 'assessment' | 'revision'
>;

export const STUDY_NOW_MINUTE_OPTIONS = [20, 30, 45, 60, 90];

/**
 * The single best task for the minutes available right now, with reason codes
 * and a timed micro-plan. Deterministic for fixed data + config. Returns null
 * when the academic year is missing.
 */
export async function getStudyNow(
  repos: StudyNowRepos,
  academicYearId: string,
  asOf: string,
  availableMinutes: number,
): Promise<StudyNowResult | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  const candidates = await buildDailyCandidates(repos, academicYearId, asOf);
  return pickStudyNow({ candidates, availableMinutes, asOf });
}
