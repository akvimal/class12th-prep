import { projectionV1 } from '@/config/projection';
import {
  projectSubjectScore,
  type ProjectionAssessment,
  type SubjectProjection,
} from '@/domain/projection/projection';
import type { Repositories } from '@/persistence/ports';
import { getCurriculumProgress } from './progress';

type ProjectionRepos = Pick<
  Repositories,
  'planning' | 'curriculum' | 'progress' | 'assessment' | 'assessmentResult'
>;

export interface SubjectProjectionView extends SubjectProjection {
  subjectName: string;
  targetPct: number | null;
  subjectMaxMarks: number | null;
  targetMarks: number | null;
  projectedMarks: number | null;
  /** max(0, targetMarks − projectedMarks). */
  marksOpportunity: number | null;
}

export interface BoardProjection {
  subjects: SubjectProjectionView[];
  overall: {
    projectedPct: number | null;
    targetPct: number | null;
    marksOpportunity: number | null;
    subjectsWithProjection: number;
    totalSubjects: number;
  };
  algorithmVersion: string;
}

function pct(part: number, whole: number | null): number | null {
  return whole && whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

/**
 * Per-subject projected board score and marks opportunity
 * (docs/ALGORITHMS.md §11), plus a syllabus-weighted overall. A subject's
 * projection is null until it clears the evidence bar (`projection-v1`).
 * Returns null when the academic year is missing.
 */
export async function getBoardProjection(
  repos: ProjectionRepos,
  academicYearId: string,
): Promise<BoardProjection | null> {
  const progress = await getCurriculumProgress(repos, academicYearId);
  if (!progress) return null;

  const [enrollments, completed] = await Promise.all([
    repos.planning.listEnrollments(academicYearId),
    repos.assessment.listAssessments(academicYearId, { status: 'COMPLETED' }),
  ]);
  const enrollmentBySubject = new Map(enrollments.map((e) => [e.subjectId, e]));

  // Graded assessment percentages grouped by subject.
  const assessmentsBySubject = new Map<string, ProjectionAssessment[]>();
  for (const a of completed) {
    const result = await repos.assessmentResult.getResult(a.id);
    if (!result || !result.maxMarks) continue;
    const list = assessmentsBySubject.get(a.subjectId) ?? [];
    list.push({ type: a.type, scorePct: (result.score / result.maxMarks) * 100 });
    assessmentsBySubject.set(a.subjectId, list);
  }

  const subjects: SubjectProjectionView[] = [];
  for (const subject of progress.subjects) {
    const enrollment = enrollmentBySubject.get(subject.id);
    const subjectMaxMarks =
      (enrollment?.theoryMaxMarks ?? 0) + (enrollment?.practicalMaxMarks ?? 0) || null;
    const targetPct = pct(enrollment?.targetMarks ?? 0, subjectMaxMarks);

    const chapters = subject.units.flatMap((u) =>
      u.chapters.map((c) => ({
        chapterId: c.id,
        boardWeight: c.weights[0]?.value ?? null,
        effectiveReadiness: c.progress.effectiveReadiness,
      })),
    );

    const projection = projectSubjectScore(
      {
        subjectKey: subject.key,
        targetPct,
        chapters,
        assessments: assessmentsBySubject.get(subject.id) ?? [],
      },
      projectionV1,
    );

    const projectedMarks =
      projection.projectedPct != null && subjectMaxMarks != null
        ? Math.round((projection.projectedPct / 100) * subjectMaxMarks)
        : null;
    const marksOpportunity =
      projectedMarks != null && enrollment?.targetMarks != null
        ? Math.max(0, enrollment.targetMarks - projectedMarks)
        : null;

    subjects.push({
      ...projection,
      subjectName: subject.name,
      targetPct,
      subjectMaxMarks,
      targetMarks: enrollment?.targetMarks ?? null,
      projectedMarks,
      marksOpportunity,
    });
  }

  // Syllabus-weighted overall, over the subjects that have a projection.
  const withProjection = subjects.filter(
    (s) => s.projectedPct != null && s.subjectMaxMarks != null,
  );
  let overallProjectedPct: number | null = null;
  let overallTargetPct: number | null = null;
  let overallMarksOpportunity: number | null = null;
  if (withProjection.length > 0) {
    const totalMax = withProjection.reduce((s, x) => s + (x.subjectMaxMarks ?? 0), 0);
    overallProjectedPct =
      Math.round(
        (withProjection.reduce((s, x) => s + x.projectedPct! * (x.subjectMaxMarks ?? 0), 0) /
          totalMax) *
          10,
      ) / 10;
    const withTarget = withProjection.filter((s) => s.targetPct != null);
    if (withTarget.length === withProjection.length) {
      overallTargetPct =
        Math.round(
          (withTarget.reduce((s, x) => s + x.targetPct! * (x.subjectMaxMarks ?? 0), 0) / totalMax) *
            10,
        ) / 10;
      overallMarksOpportunity = withProjection.reduce((s, x) => s + (x.marksOpportunity ?? 0), 0);
    }
  }

  return {
    subjects,
    overall: {
      projectedPct: overallProjectedPct,
      targetPct: overallTargetPct,
      marksOpportunity: overallMarksOpportunity,
      subjectsWithProjection: withProjection.length,
      totalSubjects: subjects.length,
    },
    algorithmVersion: projectionV1.version,
  };
}
