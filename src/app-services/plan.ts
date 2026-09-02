import type { PhaseType } from '@/domain/planning/plan';
import type { PhaseSpec } from '@/domain/planning/plan-phases';
import type {
  NewSubjectEnrollment,
  PlanUpdate,
  PreparationPlanRecord,
  Repositories,
  SubjectEnrollmentRecord,
} from '@/persistence/ports';

type WithPlanning = Pick<Repositories, 'planning'>;

export interface PlanOverview {
  plan: PreparationPlanRecord;
  phases: PhaseSpec[];
  /** The phase the plan is in on the reference date. */
  currentPhase: PhaseType | null;
  referenceDate: string;
}

export interface CreatePlanInput {
  startDate: string;
  syllabusTargetDate: string;
  hardCompletionDate: string;
  revisionStartDate: string;
  examWindowStart: string;
  examWindowEnd: string;
  weekdayCapacityMinutes: number;
  weekendCapacityMinutes: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function overview(
  repos: WithPlanning,
  plan: PreparationPlanRecord,
  referenceDate: string,
): Promise<PlanOverview> {
  const phases = await repos.planning.getPlanPhases(plan.id);
  return {
    plan,
    phases,
    currentPhase: await repos.planning.resolveCurrentPhase(plan.id, referenceDate),
    referenceDate,
  };
}

export async function createPreparationPlan(
  repos: WithPlanning,
  academicYearId: string,
  input: CreatePlanInput,
): Promise<PlanOverview> {
  const plan = await repos.planning.createPlan({ academicYearId, ...input });
  return overview(repos, plan, today());
}

export async function getPlanOverview(
  repos: WithPlanning,
  planId: string,
  referenceDate: string = today(),
): Promise<PlanOverview | null> {
  const plan = await repos.planning.getPlan(planId);
  if (!plan) return null;
  return overview(repos, plan, referenceDate);
}

export async function updatePreparationPlan(
  repos: WithPlanning,
  planId: string,
  patch: PlanUpdate,
): Promise<PlanOverview | null> {
  if ((await repos.planning.getPlan(planId)) === null) return null;
  const plan = await repos.planning.updatePlan(planId, patch);
  return overview(repos, plan, today());
}

export async function configureAcademicYearCurriculum(
  repos: WithPlanning,
  academicYearId: string,
  curriculumVersionId: string,
): Promise<void> {
  await repos.planning.setAcademicYearCurriculum(academicYearId, curriculumVersionId);
}

export async function enrollSubjects(
  repos: WithPlanning,
  academicYearId: string,
  subjects: Omit<NewSubjectEnrollment, 'academicYearId'>[],
): Promise<SubjectEnrollmentRecord[]> {
  for (const subject of subjects) {
    await repos.planning.enrollSubject({ academicYearId, ...subject });
  }
  return repos.planning.listEnrollments(academicYearId);
}

export function listSubjectEnrollments(
  repos: WithPlanning,
  academicYearId: string,
): Promise<SubjectEnrollmentRecord[]> {
  return repos.planning.listEnrollments(academicYearId);
}
