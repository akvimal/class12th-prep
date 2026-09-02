import { and, asc, eq, ne } from 'drizzle-orm';
import { phasesV1, type PlanPhaseConfig } from '@/config/phases';
import { assertPlanDateOrder, type PlanDates } from '@/domain/planning/plan-dates';
import { resolvePhaseAt, resolvePlanPhases, type PhaseSpec } from '@/domain/planning/plan-phases';
import {
  academicYears,
  families,
  planPhases,
  preparationPlans,
  students,
  subjectEnrollments,
} from '@/persistence/schema';
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
import type { DrizzleDb } from './db';

type PlanRow = typeof preparationPlans.$inferSelect;

function toRecord(row: PlanRow): PreparationPlanRecord {
  return {
    id: row.id,
    status: row.status,
    academicYearId: row.academicYearId,
    startDate: row.startDate,
    syllabusTargetDate: row.syllabusTargetDate,
    hardCompletionDate: row.hardCompletionDate,
    revisionStartDate: row.revisionStartDate,
    examWindowStart: row.examWindowStart,
    examWindowEnd: row.examWindowEnd,
    weekdayCapacityMinutes: row.weekdayCapacityMinutes,
    weekendCapacityMinutes: row.weekendCapacityMinutes,
  };
}

function pickDates(row: PlanDates): PlanDates {
  return {
    startDate: row.startDate,
    syllabusTargetDate: row.syllabusTargetDate,
    hardCompletionDate: row.hardCompletionDate,
    revisionStartDate: row.revisionStartDate,
    examWindowStart: row.examWindowStart,
    examWindowEnd: row.examWindowEnd,
  };
}

function phaseRows(planId: string, dates: PlanDates, config: PlanPhaseConfig) {
  return resolvePlanPhases(dates, config).map((phase) => ({
    preparationPlanId: planId,
    phaseType: phase.phaseType,
    startDate: phase.startDate,
    endDate: phase.endDate,
    configJson: {
      configVersion: config.version,
      foundationDays: config.foundationDays,
      preboardLeadDays: config.preboardLeadDays,
    },
  }));
}

function toEnrollment(row: typeof subjectEnrollments.$inferSelect): SubjectEnrollmentRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    subjectId: row.subjectId,
    theoryMaxMarks: row.theoryMaxMarks,
    practicalMaxMarks: row.practicalMaxMarks,
    targetMarks: row.targetMarks,
    boardExamDate: row.boardExamDate,
    enabled: row.enabled,
  };
}

export function createDrizzlePlanningRepository(
  db: DrizzleDb,
  phaseConfig: PlanPhaseConfig = phasesV1,
): PlanningRepository {
  async function getPlanPhases(planId: string): Promise<PhaseSpec[]> {
    return db
      .select({
        phaseType: planPhases.phaseType,
        startDate: planPhases.startDate,
        endDate: planPhases.endDate,
      })
      .from(planPhases)
      .where(eq(planPhases.preparationPlanId, planId))
      .orderBy(asc(planPhases.startDate));
  }

  return {
    async createFamily(input: NewFamily) {
      const [row] = await db
        .insert(families)
        .values({ name: input.name })
        .returning({ id: families.id });
      return { id: row!.id };
    },

    async createStudent(input: NewStudent) {
      const [row] = await db
        .insert(students)
        .values({
          familyId: input.familyId,
          displayName: input.displayName,
          board: input.board,
          grade: input.grade,
          ...(input.timezone ? { timezone: input.timezone } : {}),
        })
        .returning({ id: students.id });
      return { id: row!.id };
    },

    async createAcademicYear(input: NewAcademicYear) {
      const [row] = await db
        .insert(academicYears)
        .values({
          studentId: input.studentId,
          yearLabel: input.yearLabel,
          startDate: input.startDate,
          endDate: input.endDate,
          curriculumVersionId: input.curriculumVersionId ?? null,
        })
        .returning({ id: academicYears.id });
      return { id: row!.id };
    },

    async getAcademicYear(academicYearId: string) {
      const [row] = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.id, academicYearId));
      return row
        ? {
            id: row.id,
            studentId: row.studentId,
            yearLabel: row.yearLabel,
            curriculumVersionId: row.curriculumVersionId,
            startDate: row.startDate,
            endDate: row.endDate,
          }
        : null;
    },

    async setAcademicYearCurriculum(academicYearId: string, curriculumVersionId: string) {
      const updated = await db
        .update(academicYears)
        .set({ curriculumVersionId })
        .where(eq(academicYears.id, academicYearId))
        .returning({ id: academicYears.id });
      if (updated.length === 0) throw new Error(`academic year ${academicYearId} not found`);
    },

    async createPlan(input: NewPreparationPlan) {
      assertPlanDateOrder(input);
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(preparationPlans)
          .values({
            academicYearId: input.academicYearId,
            startDate: input.startDate,
            syllabusTargetDate: input.syllabusTargetDate,
            hardCompletionDate: input.hardCompletionDate,
            revisionStartDate: input.revisionStartDate,
            examWindowStart: input.examWindowStart,
            examWindowEnd: input.examWindowEnd,
            weekdayCapacityMinutes: input.weekdayCapacityMinutes,
            weekendCapacityMinutes: input.weekendCapacityMinutes,
          })
          .returning();
        await tx.insert(planPhases).values(phaseRows(row!.id, pickDates(row!), phaseConfig));
        return toRecord(row!);
      });
    },

    async updatePlan(planId: string, patch: PlanUpdate) {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(preparationPlans)
          .where(eq(preparationPlans.id, planId));
        if (!current) throw new Error(`preparation plan ${planId} not found`);

        const next = { ...toRecord(current), ...patch };
        assertPlanDateOrder(next);

        const [row] = await tx
          .update(preparationPlans)
          .set({
            startDate: next.startDate,
            syllabusTargetDate: next.syllabusTargetDate,
            hardCompletionDate: next.hardCompletionDate,
            revisionStartDate: next.revisionStartDate,
            examWindowStart: next.examWindowStart,
            examWindowEnd: next.examWindowEnd,
            weekdayCapacityMinutes: next.weekdayCapacityMinutes,
            weekendCapacityMinutes: next.weekendCapacityMinutes,
          })
          .where(eq(preparationPlans.id, planId))
          .returning();

        await tx.delete(planPhases).where(eq(planPhases.preparationPlanId, planId));
        await tx.insert(planPhases).values(phaseRows(planId, pickDates(row!), phaseConfig));
        return toRecord(row!);
      });
    },

    async activatePlan(planId: string) {
      await db.transaction(async (tx) => {
        const [plan] = await tx
          .select({ academicYearId: preparationPlans.academicYearId })
          .from(preparationPlans)
          .where(eq(preparationPlans.id, planId));
        if (!plan) throw new Error(`preparation plan ${planId} not found`);

        await tx
          .update(preparationPlans)
          .set({ status: 'ARCHIVED' })
          .where(
            and(
              eq(preparationPlans.academicYearId, plan.academicYearId),
              eq(preparationPlans.status, 'ACTIVE'),
              ne(preparationPlans.id, planId),
            ),
          );

        await tx
          .update(preparationPlans)
          .set({ status: 'ACTIVE' })
          .where(eq(preparationPlans.id, planId));
      });
    },

    async getPlan(planId: string) {
      const [row] = await db.select().from(preparationPlans).where(eq(preparationPlans.id, planId));
      return row ? toRecord(row) : null;
    },

    getPlanPhases,

    async resolveCurrentPhase(planId: string, onDate: string) {
      return resolvePhaseAt(await getPlanPhases(planId), onDate);
    },

    async enrollSubject(input: NewSubjectEnrollment) {
      const [row] = await db
        .insert(subjectEnrollments)
        .values({
          academicYearId: input.academicYearId,
          subjectId: input.subjectId,
          theoryMaxMarks: input.theoryMaxMarks ?? null,
          practicalMaxMarks: input.practicalMaxMarks ?? null,
          targetMarks: input.targetMarks ?? null,
          boardExamDate: input.boardExamDate ?? null,
          ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
        })
        .returning({ id: subjectEnrollments.id });
      return { id: row!.id };
    },

    async updateEnrollment(enrollmentId: string, patch: SubjectEnrollmentUpdate) {
      const [row] = await db
        .update(subjectEnrollments)
        .set(patch)
        .where(eq(subjectEnrollments.id, enrollmentId))
        .returning();
      if (!row) throw new Error(`subject enrollment ${enrollmentId} not found`);
      return toEnrollment(row);
    },

    async listEnrollments(academicYearId: string) {
      const rows = await db
        .select()
        .from(subjectEnrollments)
        .where(eq(subjectEnrollments.academicYearId, academicYearId))
        .orderBy(asc(subjectEnrollments.subjectId));
      return rows.map(toEnrollment);
    },

    async listStudentsByFamily(familyId: string) {
      return db
        .select({ id: students.id, displayName: students.displayName })
        .from(students)
        .where(eq(students.familyId, familyId));
    },
  };
}
