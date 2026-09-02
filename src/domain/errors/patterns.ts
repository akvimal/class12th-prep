import type { ErrorPatternsConfig } from '@/config/error-patterns';
import { isKnowledgeGap, type ErrorType } from './errors';

export interface ErrorObservation {
  subjectId: string;
  chapterId: string;
  errorType: ErrorType;
  marksLost: number;
  /** ISO date the error was recorded. */
  on: string;
}

export interface ErrorPattern {
  scope: 'CHAPTER' | 'SUBJECT';
  errorType: ErrorType;
  subjectId: string;
  /** The chapter for a CHAPTER pattern; null for a SUBJECT pattern. */
  chapterId: string | null;
  occurrences: number;
  marksLost: number;
  firstSeen: string;
  lastSeen: string;
  knowledgeGap: boolean;
  algorithmVersion: string;
}

interface Bucket {
  subjectId: string;
  chapterIds: Set<string>;
  errorType: ErrorType;
  occurrences: number;
  marksLost: number;
  firstSeen: string;
  lastSeen: string;
}

function accumulate(map: Map<string, Bucket>, key: string, o: ErrorObservation) {
  const b = map.get(key) ?? {
    subjectId: o.subjectId,
    chapterIds: new Set<string>(),
    errorType: o.errorType,
    occurrences: 0,
    marksLost: 0,
    firstSeen: o.on,
    lastSeen: o.on,
  };
  b.chapterIds.add(o.chapterId);
  b.occurrences += 1;
  b.marksLost += o.marksLost;
  if (o.on < b.firstSeen) b.firstSeen = o.on;
  if (o.on > b.lastSeen) b.lastSeen = o.on;
  map.set(key, b);
}

/**
 * Find error types that keep recurring — in one chapter, or across a subject
 * (docs/SRS.md §12). Deterministic. A subject-level pattern only fires when the
 * same error type spans two or more chapters, so it never just restates a
 * chapter pattern.
 */
export function detectErrorPatterns(
  observations: ErrorObservation[],
  config: ErrorPatternsConfig,
): ErrorPattern[] {
  const byChapter = new Map<string, Bucket>();
  const bySubject = new Map<string, Bucket>();
  for (const o of observations) {
    accumulate(byChapter, `${o.chapterId}:${o.errorType}`, o);
    accumulate(bySubject, `${o.subjectId}:${o.errorType}`, o);
  }

  const patterns: ErrorPattern[] = [];

  for (const b of byChapter.values()) {
    if (b.occurrences >= config.minChapterOccurrences && b.marksLost >= config.minMarksLost) {
      patterns.push({
        scope: 'CHAPTER',
        errorType: b.errorType,
        subjectId: b.subjectId,
        chapterId: [...b.chapterIds][0]!,
        occurrences: b.occurrences,
        marksLost: b.marksLost,
        firstSeen: b.firstSeen,
        lastSeen: b.lastSeen,
        knowledgeGap: isKnowledgeGap(b.errorType),
        algorithmVersion: config.version,
      });
    }
  }

  for (const b of bySubject.values()) {
    if (
      b.chapterIds.size >= 2 &&
      b.occurrences >= config.minSubjectOccurrences &&
      b.marksLost >= config.minMarksLost
    ) {
      patterns.push({
        scope: 'SUBJECT',
        errorType: b.errorType,
        subjectId: b.subjectId,
        chapterId: null,
        occurrences: b.occurrences,
        marksLost: b.marksLost,
        firstSeen: b.firstSeen,
        lastSeen: b.lastSeen,
        knowledgeGap: isKnowledgeGap(b.errorType),
        algorithmVersion: config.version,
      });
    }
  }

  return patterns.sort((a, b) => b.marksLost - a.marksLost);
}
