import type { PlanStatus } from '@/domain/planning/plan';

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

export interface Repositories {
  health: HealthProbe;
  planning: PlanningRepository;
}
