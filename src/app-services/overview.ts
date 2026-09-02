import { daysBetween } from '@/domain/planning/dates';
import type { PhaseType } from '@/domain/planning/plan';
import type { PhaseSpec } from '@/domain/planning/plan-phases';
import { getPlanOverview } from './plan';
import { getCurriculumProgress } from './progress';
import { getAcademicYearReadiness } from './readiness';
import type { Repositories } from '@/persistence/ports';

type Repos = Pick<Repositories, 'progress' | 'planning' | 'curriculum' | 'readiness'>;

const ADVANCED_STATES = ['REVISED', 'EXAM_READY'];

export interface ChapterOverview {
  key: string;
  name: string;
  subjectKey: string;
  subjectName: string;
  state: string;
  schoolStatus: string;
  readiness: number;
  weight: number | null;
  weightIsOfficial: boolean;
}

export interface SubjectOverview {
  key: string;
  name: string;
  code: string | null;
  readiness: number;
  chapters: ChapterOverview[];
  counts: { examReady: number; inProgress: number; notStarted: number };
}

export interface AttentionItem {
  subjectName: string;
  subjectKey: string;
  chapterKey: string;
  chapterName: string;
  readiness: number;
  reasons: string[];
}

export interface StudentOverview {
  academicYearId: string;
  planId: string;
  currentPhase: PhaseType | null;
  phases: PhaseSpec[];
  overallReadiness: number;
  daysToSyllabusTarget: number;
  daysToExam: number;
  syllabusTargetDate: string;
  examWindowStart: string;
  subjects: SubjectOverview[];
  needsAttention: AttentionItem[];
}

const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

export async function getStudentOverview(
  repos: Repos,
  academicYearId: string,
  planId: string,
  asOf: string,
): Promise<StudentOverview | null> {
  const [progress, plan] = await Promise.all([
    getCurriculumProgress(repos, academicYearId),
    getPlanOverview(repos, planId, asOf),
  ]);
  if (!progress || !plan) return null;

  const snapshots = (await getAcademicYearReadiness(repos, academicYearId)) ?? [];
  const readinessByChapter = new Map(snapshots.map((s) => [s.scopeId, s.readiness]));

  const subjects: SubjectOverview[] = progress.subjects.map((subject) => {
    const chapters: ChapterOverview[] = subject.units.flatMap((unit) =>
      unit.chapters.map((chapter) => ({
        key: chapter.key,
        name: chapter.name,
        subjectKey: subject.key,
        subjectName: subject.name,
        state: chapter.progress.state,
        schoolStatus: chapter.progress.schoolStatus,
        readiness: Math.round(
          readinessByChapter.get(chapter.id) ?? chapter.progress.effectiveReadiness ?? 0,
        ),
        weight: chapter.weights[0]?.value ?? null,
        weightIsOfficial: chapter.weights.some((w) => w.sourceType === 'OFFICIAL'),
      })),
    );

    return {
      key: subject.key,
      name: subject.name,
      code: subject.code,
      readiness: avg(chapters.map((c) => c.readiness)),
      chapters,
      counts: {
        examReady: chapters.filter((c) => ADVANCED_STATES.includes(c.state)).length,
        inProgress: chapters.filter(
          (c) => c.state !== 'NOT_STARTED' && !ADVANCED_STATES.includes(c.state),
        ).length,
        notStarted: chapters.filter((c) => c.state === 'NOT_STARTED').length,
      },
    };
  });

  const needsAttention: AttentionItem[] = subjects
    .flatMap((s) => s.chapters)
    .filter((c) => c.readiness < 55)
    .sort((a, b) => a.readiness - b.readiness || (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 3)
    .map((c) => {
      const reasons: string[] = [];
      if (c.schoolStatus === 'NOT_TAUGHT') reasons.push('Not taught yet');
      else if (c.schoolStatus === 'CURRENTLY_TEACHING') reasons.push('Being taught now');
      if ((c.weight ?? 0) >= 8) reasons.push('High board weight');
      return {
        subjectName: c.subjectName,
        subjectKey: c.subjectKey,
        chapterKey: c.key,
        chapterName: c.name,
        readiness: c.readiness,
        reasons,
      };
    });

  return {
    academicYearId,
    planId,
    currentPhase: plan.currentPhase,
    phases: plan.phases,
    overallReadiness: avg(subjects.map((s) => s.readiness)),
    daysToSyllabusTarget: Math.max(0, daysBetween(asOf, plan.plan.syllabusTargetDate)),
    daysToExam: Math.max(0, daysBetween(asOf, plan.plan.examWindowStart)),
    syllabusTargetDate: plan.plan.syllabusTargetDate,
    examWindowStart: plan.plan.examWindowStart,
    subjects,
    needsAttention,
  };
}
