import type { PlanStatus } from '@/domain/planning/plan';
import type { CurriculumVersionView, SubjectNode } from '@/domain/curriculum/hierarchy';
import type { WeightSourceType, WeightUnit } from '@/domain/curriculum/provenance';

/**
 * Repository ports.
 *
 * Application services depend on these interfaces only — never on a concrete
 * database or ORM. Implementations live in ./drizzle (PostgreSQL) and, for the
 * UI shell and unit tests, ./in-memory.
 */

export interface HealthProbe {
  /** Returns true when the backing store is reachable. Never throws. */
  isReachable(): Promise<boolean>;
}

// --- Planning (TASK-002: tenant / student / academic year / plan) ---

export interface NewFamily {
  name: string;
}

export interface NewStudent {
  familyId: string;
  displayName: string;
  board: string;
  grade: number;
  timezone?: string;
}

export interface NewAcademicYear {
  studentId: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  curriculumVersionId?: string | null;
}

export interface NewPreparationPlan {
  academicYearId: string;
  startDate: string;
  syllabusTargetDate: string;
  hardCompletionDate: string;
  revisionStartDate: string;
  examWindowStart: string;
  examWindowEnd: string;
  weekdayCapacityMinutes: number;
  weekendCapacityMinutes: number;
}

export interface PreparationPlanRecord extends NewPreparationPlan {
  id: string;
  status: PlanStatus;
}

export interface PlanningRepository {
  createFamily(input: NewFamily): Promise<{ id: string }>;
  createStudent(input: NewStudent): Promise<{ id: string }>;
  createAcademicYear(input: NewAcademicYear): Promise<{ id: string }>;
  /** Creates a plan in DRAFT status. Throws if the dates are out of order. */
  createPlan(input: NewPreparationPlan): Promise<PreparationPlanRecord>;
  /** Makes `planId` the single ACTIVE plan for its academic year; archives any other active plan. */
  activatePlan(planId: string): Promise<void>;
  getPlan(planId: string): Promise<PreparationPlanRecord | null>;
  listStudentsByFamily(familyId: string): Promise<Array<{ id: string; displayName: string }>>;
}

// --- Curriculum (TASK-003: versioned master data + provenance) ---

export interface NewCurriculumVersion {
  board: string;
  grade: number;
  academicYearLabel: string;
  version: string;
  sourceReference?: string | null;
}

export interface NewSubject {
  curriculumVersionId: string;
  key: string;
  name: string;
  code?: string | null;
  position: number;
}

export interface NewUnit {
  subjectId: string;
  key: string;
  name: string;
  position: number;
}

export interface NewChapter {
  unitId: string;
  key: string;
  name: string;
  position: number;
}

export interface NewTopic {
  chapterId: string;
  key: string;
  name: string;
  position: number;
}

export type WeightScope =
  | { type: 'SUBJECT'; subjectId: string }
  | { type: 'UNIT'; unitId: string }
  | { type: 'CHAPTER'; chapterId: string }
  | { type: 'TOPIC'; topicId: string };

export interface NewAcademicWeight {
  scope: WeightScope;
  value: number;
  unit: WeightUnit;
  sourceType: WeightSourceType;
  sourceReference?: string | null;
  confidence?: number | null;
  effectiveFrom: string;
  retrievedAt?: string | null;
  parserVersion?: string | null;
}

export interface CurriculumRepository {
  createVersion(input: NewCurriculumVersion): Promise<{ id: string }>;
  /** Sets `publishedAt`. A student academic year may only reference a published version. */
  publishVersion(versionId: string): Promise<void>;
  addSubject(input: NewSubject): Promise<{ id: string }>;
  addUnit(input: NewUnit): Promise<{ id: string }>;
  addChapter(input: NewChapter): Promise<{ id: string }>;
  addTopic(input: NewTopic): Promise<{ id: string }>;
  /** Throws WeightProvenanceError if provenance is invalid (e.g. OFFICIAL with no reference). */
  addWeight(input: NewAcademicWeight): Promise<{ id: string }>;

  listVersions(): Promise<CurriculumVersionView[]>;
  getVersion(versionId: string): Promise<CurriculumVersionView | null>;
  /** Full subject -> unit -> chapter -> topic tree, ordered by position then key, weights attached. */
  getHierarchy(versionId: string): Promise<SubjectNode[]>;
  getSubjectHierarchy(subjectId: string): Promise<SubjectNode | null>;
}

export interface Repositories {
  health: HealthProbe;
  planning: PlanningRepository;
  curriculum: CurriculumRepository;
}
