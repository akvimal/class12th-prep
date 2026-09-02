import type { PhaseType, PlanStatus } from '@/domain/planning/plan';
import type { PhaseSpec } from '@/domain/planning/plan-phases';
import type { CalendarEvent, SchoolEventType } from '@/domain/planning/school-calendar';
import type { CurriculumVersionView, SubjectNode } from '@/domain/curriculum/hierarchy';
import type { WeightSourceType, WeightUnit } from '@/domain/curriculum/provenance';
import type { ChapterProgressView } from '@/domain/progress/view';
import type {
  ChapterState,
  ConfidenceLevel,
  InterestLevel,
  SchoolChapterStatus,
} from '@/domain/progress/chapter-progress';

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

export interface PlanUpdate {
  startDate?: string;
  syllabusTargetDate?: string;
  hardCompletionDate?: string;
  revisionStartDate?: string;
  examWindowStart?: string;
  examWindowEnd?: string;
  weekdayCapacityMinutes?: number;
  weekendCapacityMinutes?: number;
}

export interface NewSubjectEnrollment {
  academicYearId: string;
  subjectId: string;
  theoryMaxMarks?: number | null;
  practicalMaxMarks?: number | null;
  targetMarks?: number | null;
  boardExamDate?: string | null;
  enabled?: boolean;
}

export interface SubjectEnrollmentUpdate {
  theoryMaxMarks?: number | null;
  practicalMaxMarks?: number | null;
  targetMarks?: number | null;
  boardExamDate?: string | null;
  enabled?: boolean;
}

export interface SubjectEnrollmentRecord {
  id: string;
  academicYearId: string;
  subjectId: string;
  theoryMaxMarks: number | null;
  practicalMaxMarks: number | null;
  targetMarks: number | null;
  boardExamDate: string | null;
  enabled: boolean;
}

export interface AcademicYearRecord {
  id: string;
  studentId: string;
  yearLabel: string;
  curriculumVersionId: string | null;
  startDate: string;
  endDate: string;
}

export interface PlanningRepository {
  createFamily(input: NewFamily): Promise<{ id: string }>;
  createStudent(input: NewStudent): Promise<{ id: string }>;
  createAcademicYear(input: NewAcademicYear): Promise<{ id: string }>;
  getAcademicYear(academicYearId: string): Promise<AcademicYearRecord | null>;
  /** Points an academic year at a published curriculum version. */
  setAcademicYearCurriculum(academicYearId: string, curriculumVersionId: string): Promise<void>;

  /** Creates a plan in DRAFT status and generates its phases. Throws if the dates are out of order. */
  createPlan(input: NewPreparationPlan): Promise<PreparationPlanRecord>;
  /** Applies a partial change to dates/capacity, re-validates ordering, and regenerates phases. */
  updatePlan(planId: string, patch: PlanUpdate): Promise<PreparationPlanRecord>;
  /** Makes `planId` the single ACTIVE plan for its academic year; archives any other active plan. */
  activatePlan(planId: string): Promise<void>;
  getPlan(planId: string): Promise<PreparationPlanRecord | null>;
  /** The plan's derived phases, ordered, contiguous. Empty if the plan does not exist. */
  getPlanPhases(planId: string): Promise<PhaseSpec[]>;
  /** Which phase the plan is in on `onDate` (ISO). Null before it starts / after the exam window. */
  resolveCurrentPhase(planId: string, onDate: string): Promise<PhaseType | null>;

  enrollSubject(input: NewSubjectEnrollment): Promise<{ id: string }>;
  updateEnrollment(
    enrollmentId: string,
    patch: SubjectEnrollmentUpdate,
  ): Promise<SubjectEnrollmentRecord>;
  listEnrollments(academicYearId: string): Promise<SubjectEnrollmentRecord[]>;

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

// --- School calendar (TASK-005) ---

export interface NewCalendarEvent {
  academicYearId: string;
  type: SchoolEventType;
  title?: string | null;
  startDate: string;
  endDate: string;
  capacityOverride?: number | null;
  notes?: string | null;
}

export interface CalendarEventUpdate {
  type?: SchoolEventType;
  title?: string | null;
  startDate?: string;
  endDate?: string;
  capacityOverride?: number | null;
  notes?: string | null;
}

export interface CalendarEventRecord {
  id: string;
  academicYearId: string;
  type: SchoolEventType;
  title: string | null;
  startDate: string;
  endDate: string;
  capacityOverride: number | null;
  notes: string | null;
}

export interface SchoolCalendarRepository {
  addEvent(input: NewCalendarEvent): Promise<{ id: string }>;
  updateEvent(eventId: string, patch: CalendarEventUpdate): Promise<CalendarEventRecord>;
  deleteEvent(eventId: string): Promise<void>;
  /** Events for an academic year, optionally overlapping [from, to], ordered by start date. */
  listEvents(
    academicYearId: string,
    range?: { from?: string; to?: string },
  ): Promise<CalendarEventRecord[]>;
  /** The subset needed by the capacity engine (id/type/dates/override). */
  eventsForCapacity(academicYearId: string, from: string, to: string): Promise<CalendarEvent[]>;
}

// --- Chapter progress (TASK-007) ---

export interface ChapterProgressPatch {
  state?: ChapterState;
  confidence?: ConfidenceLevel | null;
  interest?: InterestLevel | null;
  schoolStatus?: SchoolChapterStatus;
  conceptScore?: number;
  practiceScore?: number;
  testScore?: number;
  recallScore?: number;
  revisionScore?: number;
  effectiveReadiness?: number | null;
  lastStudiedAt?: string | null;
  lastRevisedAt?: string | null;
}

export interface ProgressRepository {
  /** Create or update the progress row for (academicYear, chapter). Validates score ranges. */
  setChapterProgress(
    academicYearId: string,
    chapterId: string,
    patch: ChapterProgressPatch,
  ): Promise<ChapterProgressView>;
  getChapterProgress(
    academicYearId: string,
    chapterId: string,
  ): Promise<ChapterProgressView | null>;
  listChapterProgress(academicYearId: string): Promise<ChapterProgressView[]>;
}

export interface Repositories {
  health: HealthProbe;
  planning: PlanningRepository;
  curriculum: CurriculumRepository;
  schoolCalendar: SchoolCalendarRepository;
  progress: ProgressRepository;
}
