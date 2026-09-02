import { getCurriculumProgress } from './progress';
import { getChapterReadiness } from './readiness';
import { listStudySessions } from './session';
import type {
  QuestionErrorRecord,
  ReadinessSnapshotRecord,
  Repositories,
  StudySessionRecord,
} from '@/persistence/ports';
import type { ChapterProgressView } from '@/domain/progress/view';
import type { WeightView } from '@/domain/curriculum/hierarchy';

type Repos = Pick<
  Repositories,
  'progress' | 'planning' | 'curriculum' | 'readiness' | 'session' | 'assessmentResult'
>;

export interface ChapterView {
  subjectKey: string;
  subjectName: string;
  unitName: string;
  chapterId: string;
  chapterKey: string;
  chapterName: string;
  progress: ChapterProgressView;
  readiness: ReadinessSnapshotRecord | null;
  /** Oldest → newest, capped. */
  readinessHistory: ReadinessSnapshotRecord[];
  weights: WeightView[];
  recentSessions: StudySessionRecord[];
  /** Errors tagged to this chapter from graded tests, newest first. */
  questionErrors: QuestionErrorRecord[];
}

export async function getChapterView(
  repos: Repos,
  academicYearId: string,
  subjectKey: string,
  chapterKey: string,
): Promise<ChapterView | null> {
  const progress = await getCurriculumProgress(repos, academicYearId);
  if (!progress) return null;

  const subject = progress.subjects.find((s) => s.key === subjectKey);
  if (!subject) return null;

  for (const unit of subject.units) {
    const chapter = unit.chapters.find((c) => c.key === chapterKey);
    if (!chapter) continue;

    const [readiness, sessions, questionErrors] = await Promise.all([
      getChapterReadiness(repos, academicYearId, chapter.id),
      listStudySessions(repos, academicYearId, { chapterId: chapter.id }),
      repos.assessmentResult.listErrors(academicYearId, { chapterId: chapter.id, limit: 8 }),
    ]);

    return {
      subjectKey: subject.key,
      subjectName: subject.name,
      unitName: unit.name,
      chapterId: chapter.id,
      chapterKey: chapter.key,
      chapterName: chapter.name,
      progress: chapter.progress,
      readiness: readiness?.latest ?? null,
      readinessHistory: [...(readiness?.history ?? [])].reverse().slice(-8),
      weights: chapter.weights,
      recentSessions: (sessions ?? []).slice(0, 4),
      questionErrors,
    };
  }
  return null;
}
