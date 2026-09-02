import {
  assertAssessmentDraft,
  isSchoolAssessment,
  type AssessmentType,
} from '@/domain/assessment/assessment';
import { daysBetween } from '@/domain/planning/dates';
import type { AssessmentRecord, Repositories } from '@/persistence/ports';

type WithAssessment = Pick<Repositories, 'assessment' | 'planning' | 'curriculum'>;

export interface AddAssessmentInput {
  type: AssessmentType;
  name: string;
  examDate: string;
  maxMarks?: number | null;
  subjectKey: string;
  chapterKeys: string[];
}

interface Resolved {
  subjectIdByKey: Map<string, string>;
  subjectNameById: Map<string, string>;
  chapterByKey: Map<string, { id: string; name: string; subjectId: string }>;
  chapterNameById: Map<string, string>;
}

async function resolve(repos: WithAssessment, academicYearId: string): Promise<Resolved | null> {
  const year = await repos.planning.getAcademicYear(academicYearId);
  if (!year?.curriculumVersionId) return null;
  const hierarchy = await repos.curriculum.getHierarchy(year.curriculumVersionId);

  const subjectIdByKey = new Map<string, string>();
  const subjectNameById = new Map<string, string>();
  const chapterByKey = new Map<string, { id: string; name: string; subjectId: string }>();
  const chapterNameById = new Map<string, string>();

  for (const s of hierarchy) {
    subjectIdByKey.set(s.key, s.id);
    subjectNameById.set(s.id, s.name);
    for (const u of s.units) {
      for (const c of u.chapters) {
        chapterByKey.set(c.key, { id: c.id, name: c.name, subjectId: s.id });
        chapterNameById.set(c.id, c.name);
      }
    }
  }
  return { subjectIdByKey, subjectNameById, chapterByKey, chapterNameById };
}

/** Announce a scheduled test. Returns null when the academic year has no curriculum. */
export async function addAssessment(
  repos: WithAssessment,
  academicYearId: string,
  input: AddAssessmentInput,
): Promise<AssessmentRecord | null> {
  assertAssessmentDraft({
    type: input.type,
    name: input.name,
    examDate: input.examDate,
    maxMarks: input.maxMarks,
    chapterKeys: input.chapterKeys,
  });

  const r = await resolve(repos, academicYearId);
  if (!r) return null;

  const subjectId = r.subjectIdByKey.get(input.subjectKey);
  if (!subjectId) throw new Error(`subject "${input.subjectKey}" is not in this curriculum`);

  const chapterIds = input.chapterKeys.map((key) => {
    const chapter = r.chapterByKey.get(key);
    if (!chapter) throw new Error(`chapter "${key}" is not in this curriculum`);
    if (chapter.subjectId !== subjectId) {
      throw new Error(`chapter "${key}" is not in subject "${input.subjectKey}"`);
    }
    return chapter.id;
  });

  return repos.assessment.createAssessment({
    academicYearId,
    subjectId,
    type: input.type,
    name: input.name,
    examDate: input.examDate,
    maxMarks: input.maxMarks ?? null,
    chapterIds,
  });
}

export interface UpcomingAssessment {
  id: string;
  type: AssessmentType;
  name: string;
  examDate: string;
  daysUntil: number;
  maxMarks: number | null;
  subjectKey: string | null;
  subjectName: string;
  chapters: { name: string }[];
}

/** ANNOUNCED assessments with exam date on/after `asOf`, soonest first. */
export async function listUpcomingAssessments(
  repos: WithAssessment,
  academicYearId: string,
  asOf: string,
): Promise<UpcomingAssessment[]> {
  const r = await resolve(repos, academicYearId);
  const records = await repos.assessment.listAssessments(academicYearId, {
    from: asOf,
    status: 'ANNOUNCED',
  });
  const subjectKeyById = r
    ? new Map([...r.subjectIdByKey.entries()].map(([k, v]) => [v, k]))
    : new Map<string, string>();

  return records.map((a) => ({
    id: a.id,
    type: a.type,
    name: a.name,
    examDate: a.examDate,
    daysUntil: daysBetween(asOf, a.examDate),
    maxMarks: a.maxMarks,
    subjectKey: subjectKeyById.get(a.subjectId) ?? null,
    subjectName: r?.subjectNameById.get(a.subjectId) ?? '',
    chapters: a.chapterIds.map((id) => ({ name: r?.chapterNameById.get(id) ?? id })),
  }));
}

/**
 * For the daily planner: the fewest days until the next ANNOUNCED *school* test
 * that covers each chapter (by chapter id). Chapters with no upcoming school
 * test are absent from the map.
 */
export async function nextSchoolTestDaysByChapter(
  repos: WithAssessment,
  academicYearId: string,
  asOf: string,
): Promise<Map<string, number>> {
  const records = await repos.assessment.listAssessments(academicYearId, {
    from: asOf,
    status: 'ANNOUNCED',
  });
  const days = new Map<string, number>();
  for (const a of records) {
    if (!isSchoolAssessment(a.type)) continue;
    const d = daysBetween(asOf, a.examDate);
    for (const chapterId of a.chapterIds) {
      const current = days.get(chapterId);
      if (current === undefined || d < current) days.set(chapterId, d);
    }
  }
  return days;
}
