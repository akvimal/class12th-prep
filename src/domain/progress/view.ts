import type { SubjectNode } from '@/domain/curriculum/hierarchy';
import type {
  ChapterState,
  ComponentScores,
  ConfidenceLevel,
  InterestLevel,
  SchoolChapterStatus,
} from './chapter-progress';

/** A chapter's progress as returned alongside curriculum data. */
export interface ChapterProgressView extends ComponentScores {
  chapterId: string;
  state: ChapterState;
  confidence: ConfidenceLevel | null;
  interest: InterestLevel | null;
  schoolStatus: SchoolChapterStatus;
  effectiveReadiness: number | null;
  lastStudiedAt: string | null;
  lastRevisedAt: string | null;
}

export type ChapterWithProgress = SubjectNode['units'][number]['chapters'][number] & {
  progress: ChapterProgressView;
};

export type UnitWithProgress = Omit<SubjectNode['units'][number], 'chapters'> & {
  chapters: ChapterWithProgress[];
};

export type SubjectWithProgress = Omit<SubjectNode, 'units'> & {
  units: UnitWithProgress[];
};

/** The state a chapter has before the student has recorded anything. */
export function defaultChapterProgress(chapterId: string): ChapterProgressView {
  return {
    chapterId,
    state: 'NOT_STARTED',
    confidence: null,
    interest: null,
    schoolStatus: 'NOT_TAUGHT',
    conceptScore: 0,
    practiceScore: 0,
    testScore: 0,
    recallScore: 0,
    revisionScore: 0,
    effectiveReadiness: null,
    lastStudiedAt: null,
    lastRevisedAt: null,
  };
}

/** Merge a curriculum hierarchy with a set of progress records, keyed by chapter id. */
export function mergeProgress(
  subjects: SubjectNode[],
  progressByChapter: Map<string, ChapterProgressView>,
): SubjectWithProgress[] {
  return subjects.map((subject) => ({
    ...subject,
    units: subject.units.map((unit) => ({
      ...unit,
      chapters: unit.chapters.map((chapter) => ({
        ...chapter,
        progress: progressByChapter.get(chapter.id) ?? defaultChapterProgress(chapter.id),
      })),
    })),
  }));
}
