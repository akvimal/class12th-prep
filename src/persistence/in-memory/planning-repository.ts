import { randomUUID } from 'node:crypto';
import { assertPlanDateOrder } from '@/domain/planning/plan-dates';
import type {
  NewAcademicYear,
  NewFamily,
  NewPreparationPlan,
  NewStudent,
  PlanningRepository,
  PreparationPlanRecord,
} from '@/persistence/ports';

/**
 * In-memory planning repository. Backs the UI shell before Postgres is
 * connected, and gives domain/service tests a fast dependency. It enforces
 * the plan-date ordering and the one-active-plan-per-year rule; it does not
 * model foreign-key cascades (those are the database's job and are covered by
 * the Drizzle repository's integration tests).
 */
export function createInMemoryPlanningRepository(): PlanningRepository {
  const families = new Set<string>();
  const students = new Map<string, { id: string; familyId: string; displayName: string }>();
  const academicYears = new Map<string, { id: string; studentId: string }>();
  const plans = new Map<string, PreparationPlanRecord>();

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
      academicYears.set(id, { id, studentId: input.studentId });
      return { id };
    },

    async createPlan(input: NewPreparationPlan) {
      assertPlanDateOrder(input);
      const record: PreparationPlanRecord = { id: randomUUID(), status: 'DRAFT', ...input };
      plans.set(record.id, record);
      return record;
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

    async listStudentsByFamily(familyId: string) {
      return [...students.values()]
        .filter((s) => s.familyId === familyId)
        .map((s) => ({ id: s.id, displayName: s.displayName }));
    },
  };
}
