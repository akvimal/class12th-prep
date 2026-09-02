import { addDays, eachDay } from '@/domain/planning/dates';
import { plannedMinutesOn } from '@/domain/planning/study-window';
import type { Repositories, StudyWindowRecord, StudyWindowUpdate } from '@/persistence/ports';
import type { NewStudyWindow } from '@/persistence/ports';

type WithWindows = Pick<Repositories, 'studyWindow' | 'session' | 'planning'>;

export async function listStudyWindows(
  repos: WithWindows,
  academicYearId: string,
): Promise<StudyWindowRecord[]> {
  return repos.studyWindow.listWindows(academicYearId);
}

export async function addStudyWindow(
  repos: WithWindows,
  input: NewStudyWindow,
): Promise<StudyWindowRecord> {
  return repos.studyWindow.createWindow(input);
}

export async function updateStudyWindow(
  repos: WithWindows,
  windowId: string,
  patch: StudyWindowUpdate,
): Promise<StudyWindowRecord> {
  return repos.studyWindow.updateWindow(windowId, patch);
}

export async function removeStudyWindow(repos: WithWindows, windowId: string): Promise<void> {
  await repos.studyWindow.deleteWindow(windowId);
}

export type AdherenceStatus = 'MET' | 'SHORT' | 'MISSED' | 'NONE_PLANNED';

export interface RhythmDay {
  date: string;
  plannedMinutes: number;
  doneMinutes: number;
  status: AdherenceStatus;
}

export interface WeeklyRhythm {
  days: RhythmDay[];
  /** Days where at least one window was planned. */
  plannedDays: number;
  /** Of the planned days, how many hit ≥ 80% of the planned minutes. */
  metDays: number;
  adherenceRate: number;
}

function status(planned: number, done: number): AdherenceStatus {
  if (planned === 0) return 'NONE_PLANNED';
  if (done >= planned * 0.8) return 'MET';
  if (done > 0) return 'SHORT';
  return 'MISSED';
}

/**
 * Planned vs. actual study minutes for each of the `windowDays` days ending on
 * `asOf` (inclusive). Adherence = met days ÷ planned days.
 */
export async function getWeeklyRhythm(
  repos: WithWindows,
  academicYearId: string,
  asOf: string,
  windowDays = 7,
): Promise<WeeklyRhythm | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year) return null;

  const from = addDays(asOf, -(windowDays - 1));
  const [windows, sessions] = await Promise.all([
    repos.studyWindow.listWindows(academicYearId),
    repos.session.listSessions(academicYearId, { from, to: asOf }),
  ]);

  const doneByDate = new Map<string, number>();
  for (const s of sessions) {
    doneByDate.set(s.sessionDate, (doneByDate.get(s.sessionDate) ?? 0) + s.actualMinutes);
  }

  const days: RhythmDay[] = eachDay(from, asOf).map((date) => {
    const plannedMinutes = plannedMinutesOn(windows, date);
    const doneMinutes = doneByDate.get(date) ?? 0;
    return { date, plannedMinutes, doneMinutes, status: status(plannedMinutes, doneMinutes) };
  });

  const plannedDays = days.filter((d) => d.plannedMinutes > 0).length;
  const metDays = days.filter((d) => d.status === 'MET').length;

  return {
    days,
    plannedDays,
    metDays,
    adherenceRate: plannedDays === 0 ? 1 : Math.round((metDays / plannedDays) * 100) / 100,
  };
}
