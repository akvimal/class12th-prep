import { randomUUID } from 'node:crypto';
import { phasesV1, type PlanPhaseConfig } from '@/config/phases';
import { assertPlanDateOrder, type PlanDates } from '@/domain/planning/plan-dates';
import { resolvePhaseAt, resolvePlanPhases, type PhaseSpec } from '@/domain/planning/plan-phases';
import type {
  NewAcademicYear,
  NewFamily,
  NewPreparationPlan,
  NewStudent,
  NewSubjectEnrollment,
  PlanningRepository,
  PlanUpdate,
  PreparationPlanRecord,
  SubjectEnrollmentRecord,
  SubjectEnrollmentUpdate,
} from '@/persistence/ports';

/**
 * In-memory planning repository. Backs the UI shell before Postgres is
 * connected, and gives domain/service tests a fast dependency. It enforces the
 * plan-date ordering, the one-active-plan-per-year rule, and regenerates
 * phases on every plan change — the same behaviour as the Drizzle repository,
 * minus the foreign-key cascades (the database's job).
 */
export function createInMemoryPlanningRepository(
  phaseConfig: PlanPhaseConfig = phasesV1,
): PlanningRepository {
  const families = new Set<string>();
  const students = new Map<string, { id: string; familyId: string; displayName: string }>();
  const academicYears = new Map<
    string,
    {
      id: string;
      studentId: string;
      yearLabel: string;
      curriculumVersionId: string | null;
      startDate: string;
      endDate: string;
    }
  >();
  const plans = new Map<string, PreparationPlanRecord>();
  const phasesByPlan = new Map<string, PhaseSpec[]>();
  const enrollments = new Map<string, SubjectEnrollmentRecord>();

  const pickDates = (d: PlanDates): PlanDates => ({
    startDate: d.startDate,
    syllabusTargetDate: d.syllabusTargetDate,
    hardCompletionDate: d.hardCompletionDate,
    revisionStartDate: d.revisionStartDate,
    examWindowStart: d.examWindowStart,
    examWindowEnd: d.examWindowEnd,
  });

  return {
    async createFamily(_input: NewFamily) {
      const id = randomUUID();
      families.add(id);
      return { id };
    },

    async createStudent(input: NewStudent) {
      const id = randomUUID();
      students.set(id, { id, familyId: input.familyId, displayName: input.displayName });
      return { id };
    },

    async createAcademicYear(input: NewAcademicYear) {
      const id = randomUUID();
      academicYears.set(id, {
        id,
        studentId: input.studentId,
        yearLabel: input.yearLabel,
        curriculumVersionId: input.curriculumVersionId ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
      });
      return { id };
    },

    async getAcademicYear(academicYearId: string) {
      const year = academicYears.get(academicYearId);
      return year ? { ...year } : null;
    },

    async setAcademicYearCurriculum(academicYearId: string, curriculumVersionId: string) {
      const year = academicYears.get(academicYearId);
      if (!year) throw new Error(`academic year ${academicYearId} not found`);
      year.curriculumVersionId = curriculumVersionId;
    },

    async createPlan(input: NewPreparationPlan) {
      assertPlanDateOrder(input);
      const record: PreparationPlanRecord = { id: randomUUID(), status: 'DRAFT', ...input };
      plans.set(record.id, record);
      phasesByPlan.set(record.id, resolvePlanPhases(pickDates(record), phaseConfig));
      return { ...record };
    },

    async updatePlan(planId: string, patch: PlanUpdate) {
      const current = plans.get(planId);
      if (!current) throw new Error(`preparation plan ${planId} not found`);
      const next = { ...current, ...patch };
      assertPlanDateOrder(next);
      plans.set(planId, next);
      phasesByPlan.set(planId, resolvePlanPhases(pickDates(next), phaseConfig));
      return { ...next };
    },

    async activatePlan(planId: string) {
      const plan = plans.get(planId);
      if (!plan) throw new Error(`preparation plan ${planId} not found`);
      for (const other of plans.values()) {
        if (other.academicYearId === plan.academicYearId && other.status === 'ACTIVE') {
          other.status = 'ARCHIVED';
        }
      }
      plan.status = 'ACTIVE';
    },

    async getPlan(planId: string) {
      const plan = plans.get(planId);
      return plan ? { ...plan } : null;
    },

    async getPlanPhases(planId: string) {
      return (phasesByPlan.get(planId) ?? []).map((p) => ({ ...p }));
    },

    async resolveCurrentPhase(planId: string, onDate: string) {
      return resolvePhaseAt(phasesByPlan.get(planId) ?? [], onDate);
    },

    async enrollSubject(input: NewSubjectEnrollment) {
      for (const e of enrollments.values()) {
        if (e.academicYearId === input.academicYearId && e.subjectId === input.subjectId) {
          throw new Error('subject already enrolled for this academic year');
        }
      }
      const record: SubjectEnrollmentRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        subjectId: input.subjectId,
        theoryMaxMarks: input.theoryMaxMarks ?? null,
        practicalMaxMarks: input.practicalMaxMarks ?? null,
        targetMarks: input.targetMarks ?? null,
        boardExamDate: input.boardExamDate ?? null,
        enabled: input.enabled ?? true,
      };
      enrollments.set(record.id, record);
      return { id: record.id };
    },

    async updateEnrollment(enrollmentId: string, patch: SubjectEnrollmentUpdate) {
      const record = enrollments.get(enrollmentId);
      if (!record) throw new Error(`subject enrollment ${enrollmentId} not found`);
      Object.assign(record, patch);
      return { ...record };
    },

    async listEnrollments(academicYearId: string) {
      return [...enrollments.values()]
        .filter((e) => e.academicYearId === academicYearId)
        .sort((a, b) => a.subjectId.localeCompare(b.subjectId))
        .map((e) => ({ ...e }));
    },

    async listStudentsByFamily(familyId: string) {
      return [...students.values()]
        .filter((s) => s.familyId === familyId)
        .map((s) => ({ id: s.id, displayName: s.displayName }));
    },
  };
}
