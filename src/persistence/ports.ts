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
import type { SessionCompletion, StudySessionType } from '@/domain/progress/study-session';
import type { ReadinessComponents } from '@/domain/readiness/readiness';
import type { AssessmentStatus, AssessmentType } from '@/domain/assessment/assessment';
import type { StudyWindowDayType } from '@/domain/planning/study-window';
import type { DeliveryStatus, DomainEventType } from '@/domain/events/events';
import type { RevisionMethod, RevisionOutcome, RevisionStatus } from '@/domain/revision/revision';
import type { ErrorState, ErrorTransition, ErrorType } from '@/domain/errors/errors';

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

export interface StudentRecord {
  id: string;
  familyId: string;
  displayName: string;
  board: string;
  grade: number;
}

export interface PlanningRepository {
  createFamily(input: NewFamily): Promise<{ id: string }>;
  createStudent(input: NewStudent): Promise<{ id: string }>;
  createAcademicYear(input: NewAcademicYear): Promise<{ id: string }>;
  getAcademicYear(academicYearId: string): Promise<AcademicYearRecord | null>;
  /** Every student on record. The single-family MVP normally has exactly one. */
  listStudents(): Promise<StudentRecord[]>;
  /** A student's academic years, most recent first (by start date). */
  listAcademicYears(studentId: string): Promise<AcademicYearRecord[]>;
  /** The single ACTIVE plan for an academic year, or null if none is active. */
  getActivePlan(academicYearId: string): Promise<PreparationPlanRecord | null>;
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

// --- Study session evidence (TASK-008) ---

export interface NewStudySession {
  academicYearId: string;
  subjectId?: string | null;
  chapterId?: string | null;
  studyTaskId?: string | null;
  type: StudySessionType;
  completion: SessionCompletion;
  sessionDate: string;
  plannedMinutes?: number | null;
  actualMinutes: number;
  attempted?: number | null;
  correct?: number | null;
  confidenceAfter?: ConfidenceLevel | null;
  startedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
}

export interface StudySessionRecord {
  id: string;
  academicYearId: string;
  subjectId: string | null;
  chapterId: string | null;
  studyTaskId: string | null;
  type: StudySessionType;
  completion: SessionCompletion;
  sessionDate: string;
  plannedMinutes: number | null;
  actualMinutes: number;
  attempted: number | null;
  correct: number | null;
  confidenceAfter: ConfidenceLevel | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SessionFilters {
  from?: string;
  to?: string;
  subjectId?: string;
  chapterId?: string;
  type?: StudySessionType;
}

export interface SessionRepository {
  /** Append an immutable session. Validates minutes/counts. */
  recordSession(input: NewStudySession): Promise<StudySessionRecord>;
  getSession(sessionId: string): Promise<StudySessionRecord | null>;
  /** History, newest first, filterable by date range / subject / chapter / type. */
  listSessions(academicYearId: string, filters?: SessionFilters): Promise<StudySessionRecord[]>;
}

// --- Readiness snapshots (TASK-009) ---

export type ReadinessScopeType = 'CHAPTER' | 'SUBJECT' | 'ACADEMIC_YEAR';

export interface NewReadinessSnapshot {
  academicYearId: string;
  scopeType: ReadinessScopeType;
  scopeId: string;
  readiness: number;
  raw: number;
  recencyFactor: number;
  components: ReadinessComponents;
  algorithmVersion: string;
  calculatedFor: string;
}

export interface ReadinessSnapshotRecord extends NewReadinessSnapshot {
  id: string;
  calculatedAt: string;
}

export interface ReadinessRepository {
  /** Append an immutable snapshot. */
  createSnapshot(input: NewReadinessSnapshot): Promise<ReadinessSnapshotRecord>;
  getLatestSnapshot(
    academicYearId: string,
    scopeType: ReadinessScopeType,
    scopeId: string,
  ): Promise<ReadinessSnapshotRecord | null>;
  /** Newest first. `limit` caps the result; without a scope, returns every scope's history. */
  listSnapshots(
    academicYearId: string,
    filters?: { scopeType?: ReadinessScopeType; scopeId?: string; limit?: number },
  ): Promise<ReadinessSnapshotRecord[]>;
  /** The most recent snapshot for every scope of a type in one academic year. */
  latestByScope(
    academicYearId: string,
    scopeType: ReadinessScopeType,
  ): Promise<ReadinessSnapshotRecord[]>;
}

// --- Assessments (Phase 2, announce-only) ---

export interface NewAssessment {
  academicYearId: string;
  subjectId: string;
  type: AssessmentType;
  name: string;
  examDate: string;
  maxMarks?: number | null;
  /** Chapter ids the test covers. At least one. */
  chapterIds: string[];
}

export interface AssessmentRecord {
  id: string;
  academicYearId: string;
  subjectId: string;
  type: AssessmentType;
  name: string;
  examDate: string;
  maxMarks: number | null;
  status: AssessmentStatus;
  chapterIds: string[];
}

export interface AssessmentFilters {
  from?: string;
  to?: string;
  status?: AssessmentStatus;
}

export interface AssessmentRepository {
  createAssessment(input: NewAssessment): Promise<AssessmentRecord>;
  getAssessment(assessmentId: string): Promise<AssessmentRecord | null>;
  /** Ordered by exam date ascending. Filterable by date range / status. */
  listAssessments(academicYearId: string, filters?: AssessmentFilters): Promise<AssessmentRecord[]>;
  setStatus(assessmentId: string, status: AssessmentStatus): Promise<AssessmentRecord>;
}

// --- Study windows (Phase 2) ---

export interface NewStudyWindow {
  academicYearId: string;
  dayType: StudyWindowDayType;
  startTime: string;
  endTime: string;
  label?: string | null;
  enabled?: boolean;
  reminderEnabled?: boolean;
}

export interface StudyWindowUpdate {
  dayType?: StudyWindowDayType;
  startTime?: string;
  endTime?: string;
  label?: string | null;
  enabled?: boolean;
  reminderEnabled?: boolean;
}

export interface StudyWindowRecord {
  id: string;
  academicYearId: string;
  dayType: StudyWindowDayType;
  startTime: string;
  endTime: string;
  label: string | null;
  enabled: boolean;
  reminderEnabled: boolean;
}

export interface StudyWindowRepository {
  createWindow(input: NewStudyWindow): Promise<StudyWindowRecord>;
  updateWindow(windowId: string, patch: StudyWindowUpdate): Promise<StudyWindowRecord>;
  deleteWindow(windowId: string): Promise<void>;
  /** Ordered by start time. */
  listWindows(academicYearId: string): Promise<StudyWindowRecord[]>;
}

// --- Domain events (Phase 2) ---

export interface NewDomainEvent {
  studentId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  dedupeKey: string;
}

export interface DomainEventRecord {
  id: string;
  studentId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  deliveryStatus: DeliveryStatus;
  createdAt: string;
}

export interface DomainEventFilters {
  eventType?: DomainEventType;
  deliveryStatus?: DeliveryStatus;
  limit?: number;
}

export interface EventRepository {
  /** Append an event, or return the existing one if `(studentId, dedupeKey)` already exists. */
  append(input: NewDomainEvent): Promise<{ record: DomainEventRecord; created: boolean }>;
  list(studentId: string, filters?: DomainEventFilters): Promise<DomainEventRecord[]>;
  setDeliveryStatus(eventId: string, status: DeliveryStatus): Promise<DomainEventRecord>;
}

// --- Spaced revision (Phase 3) ---

export interface NewRevisionSchedule {
  academicYearId: string;
  chapterId: string;
  revisionNumber: number;
  dueDate: string;
  method: RevisionMethod;
  algorithmVersion?: string | null;
}

export interface RevisionScheduleRecord {
  id: string;
  academicYearId: string;
  chapterId: string;
  revisionNumber: number;
  dueDate: string;
  method: RevisionMethod;
  status: RevisionStatus;
  outcome: RevisionOutcome | null;
  completedOn: string | null;
  createdAt: string;
}

export interface RevisionFilters {
  status?: RevisionStatus;
  chapterId?: string;
  dueOnOrBefore?: string;
  limit?: number;
}

export interface RevisionRepository {
  /** Create a SCHEDULED row. Throws if one is already active for the chapter. */
  schedule(input: NewRevisionSchedule): Promise<RevisionScheduleRecord>;
  /** The SCHEDULED row for a chapter, or null. */
  getActive(academicYearId: string, chapterId: string): Promise<RevisionScheduleRecord | null>;
  /** Ordered by due date ascending. */
  listSchedules(
    academicYearId: string,
    filters?: RevisionFilters,
  ): Promise<RevisionScheduleRecord[]>;
  /** Mark a SCHEDULED row DONE with its outcome. */
  complete(
    scheduleId: string,
    input: { outcome: RevisionOutcome; completedOn: string; sourceSessionId?: string | null },
  ): Promise<RevisionScheduleRecord>;
  setStatus(scheduleId: string, status: RevisionStatus): Promise<RevisionScheduleRecord>;
}

// --- Assessment results & question errors (Phase 3) ---

export interface NewQuestionError {
  subjectId: string;
  chapterId: string;
  marksLost: number;
  errorType: ErrorType;
  notes?: string | null;
  retestDueDate?: string | null;
}

export interface NewAssessmentResult {
  assessmentId: string;
  score: number;
  maxMarks: number;
  timeTakenMinutes?: number | null;
  errors: NewQuestionError[];
}

export interface QuestionErrorRecord {
  id: string;
  assessmentResultId: string;
  subjectId: string;
  chapterId: string;
  marksLost: number;
  errorType: ErrorType;
  state: ErrorState;
  notes: string | null;
  retestDueDate: string | null;
  createdAt: string;
}

export interface AssessmentResultRecord {
  id: string;
  assessmentId: string;
  score: number;
  maxMarks: number;
  timeTakenMinutes: number | null;
  recordedAt: string;
  errors: QuestionErrorRecord[];
}

export interface AssessmentResultRepository {
  /** Create the result and its errors. Throws if the assessment already has a result. */
  recordResult(input: NewAssessmentResult): Promise<AssessmentResultRecord>;
  getResult(assessmentId: string): Promise<AssessmentResultRecord | null>;
  /** Question errors across the academic year, newest first. */
  listErrors(
    academicYearId: string,
    filters?: { state?: ErrorState; chapterId?: string; limit?: number },
  ): Promise<QuestionErrorRecord[]>;
  advanceError(
    errorId: string,
    transition: ErrorTransition,
    opts?: { retestDueDate?: string | null },
  ): Promise<QuestionErrorRecord>;
}

export interface Repositories {
  health: HealthProbe;
  planning: PlanningRepository;
  curriculum: CurriculumRepository;
  schoolCalendar: SchoolCalendarRepository;
  progress: ProgressRepository;
  session: SessionRepository;
  readiness: ReadinessRepository;
  assessment: AssessmentRepository;
  studyWindow: StudyWindowRepository;
  events: EventRepository;
  revision: RevisionRepository;
  assessmentResult: AssessmentResultRepository;
}
