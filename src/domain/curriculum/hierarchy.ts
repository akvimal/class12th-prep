import type { WeightSourceType, WeightUnit } from './provenance';

/**
 * The academic hierarchy (docs/SRS.md §6):
 *   CurriculumVersion -> Subject -> Unit -> Chapter -> Topic
 *
 * Shapes returned by the read repositories. Provenance travels with every
 * weight so the UI can label OFFICIAL vs derived.
 */

export const CURRICULUM_SCOPE_TYPES = ['SUBJECT', 'UNIT', 'CHAPTER', 'TOPIC'] as const;
export type CurriculumScopeType = (typeof CURRICULUM_SCOPE_TYPES)[number];

export interface WeightView {
  id: string;
  scopeType: CurriculumScopeType;
  value: number;
  unit: WeightUnit;
  sourceType: WeightSourceType;
  sourceReference: string | null;
  confidence: number | null;
  effectiveFrom: string;
}

export interface TopicNode {
  id: string;
  key: string;
  name: string;
  position: number;
  weights: WeightView[];
}

export interface ChapterNode {
  id: string;
  key: string;
  name: string;
  position: number;
  topics: TopicNode[];
  weights: WeightView[];
}

export interface UnitNode {
  id: string;
  key: string;
  name: string;
  position: number;
  chapters: ChapterNode[];
  weights: WeightView[];
}

export interface SubjectNode {
  id: string;
  key: string;
  name: string;
  code: string | null;
  position: number;
  units: UnitNode[];
  weights: WeightView[];
}

export interface CurriculumVersionView {
  id: string;
  board: string;
  grade: number;
  academicYearLabel: string;
  version: string;
  sourceReference: string | null;
  publishedAt: string | null;
}
