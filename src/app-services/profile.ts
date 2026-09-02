import type { Repositories } from '@/persistence/ports';

type WithPlanning = Pick<Repositories, 'planning'>;

/**
 * The one student profile the app is currently tracking. The MVP is single
 * family / single student (build-plan "Auth & RBAC" — tenant boundaries in the
 * schema, one profile in use), so this resolves the first student, their most
 * recent academic year, and that year's ACTIVE plan.
 */
export interface ActiveProfile {
  studentId: string;
  studentName: string;
  board: string;
  grade: number;
  academicYearId: string;
  yearLabel: string;
  curriculumVersionId: string | null;
  planId: string;
}

/** Null when no student, no academic year, or no active plan exists yet. */
export async function getActiveProfile(repos: WithPlanning): Promise<ActiveProfile | null> {
  const students = await repos.planning.listStudents();
  const student = students[0];
  if (!student) return null;

  const years = await repos.planning.listAcademicYears(student.id);
  const year = years[0];
  if (!year) return null;

  const plan = await repos.planning.getActivePlan(year.id);
  if (!plan) return null;

  return {
    studentId: student.id,
    studentName: student.displayName,
    board: student.board,
    grade: student.grade,
    academicYearId: year.id,
    yearLabel: year.yearLabel,
    curriculumVersionId: year.curriculumVersionId,
    planId: plan.id,
  };
}
