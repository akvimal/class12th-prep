import type { RecalibrationConfig } from '@/config/recalibration';
import type { ReadinessComponents } from '@/domain/readiness/readiness';
import { isKnowledgeGap, type ErrorType } from '@/domain/errors/errors';
import type { AssessmentType } from './assessment';

export interface RecalibrationChapterInput {
  chapterId: string;
  /** The chapter's current readiness components (0..100 each). */
  components: ReadinessComponents;
  /** Marks lost on this chapter, summed per error type. */
  marksLostByType: Partial<Record<ErrorType, number>>;
}

export interface RecalibrationInput {
  assessmentType: AssessmentType;
  score: number;
  maxMarks: number;
  chapters: RecalibrationChapterInput[];
}

export interface ChapterRecalibration {
  chapterId: string;
  /** Only the component scores this result actually moved. */
  components: Partial<ReadinessComponents>;
  observed: { test: number; concept: number | null; recall: number | null };
  evidenceWeight: number;
  drivers: string[];
  algorithmVersion: string;
}

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

function sum(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Deterministically turn one assessment result into component-score updates for
 * the chapters it tested (docs/ALGORITHMS.md §10). Pure — same result + config
 * always produces the same patches. A chapter with no progress signal
 * (`maxMarks` of 0) is skipped.
 */
export function recalibrateFromResult(
  input: RecalibrationInput,
  config: RecalibrationConfig,
): ChapterRecalibration[] {
  if (input.maxMarks <= 0) return [];

  const pct = input.score / input.maxMarks;
  const w = config.evidenceWeight[input.assessmentType] ?? config.evidenceWeight.default;
  const ewma = (old: number, observed: number) => Math.round(old * (1 - w) + observed * w);

  const out: ChapterRecalibration[] = [];
  for (const chapter of input.chapters) {
    const lost = chapter.marksLostByType;
    const totalLost = sum(Object.values(lost).map((v) => v ?? 0));
    const memoryLost = lost.MEMORY ?? 0;
    const conceptGapLost = sum(
      (Object.entries(lost) as [ErrorType, number][])
        .filter(([type]) => isKnowledgeGap(type) && type !== 'MEMORY')
        .map(([, v]) => v ?? 0),
    );

    const testObs = clamp100(100 * (pct - (config.lossSpread * totalLost) / input.maxMarks));

    const components: Partial<ReadinessComponents> = {
      testScore: ewma(chapter.components.testScore, testObs),
    };
    const drivers = [`${input.assessmentType} result ${input.score}/${input.maxMarks}`];

    let conceptObs: number | null = null;
    if (conceptGapLost > 0) {
      conceptObs = clamp100(testObs - (config.gapPenalty * 100 * conceptGapLost) / input.maxMarks);
      components.conceptScore = ewma(chapter.components.conceptScore, conceptObs);
      drivers.push(`concept gap −${conceptGapLost}`);
    }

    let recallObs: number | null = null;
    if (memoryLost > 0) {
      recallObs = clamp100(testObs - (config.gapPenalty * 100 * memoryLost) / input.maxMarks);
      components.recallScore = ewma(chapter.components.recallScore, recallObs);
      drivers.push(`recall gap −${memoryLost}`);
    }

    out.push({
      chapterId: chapter.chapterId,
      components,
      observed: { test: testObs, concept: conceptObs, recall: recallObs },
      evidenceWeight: w,
      drivers,
      algorithmVersion: config.version,
    });
  }
  return out;
}
