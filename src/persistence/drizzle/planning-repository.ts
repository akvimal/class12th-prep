import { and, eq, ne } from 'drizzle-orm';
import { assertPlanDateOrder } from '@/domain/planning/plan-dates';
import {
  academicYears,
  families,
  preparationPlans,
  students,
} from '@/persistence/schema';
import type {
  NewAcademicYear,
  NewFamily,
  NewPreparationPlan,
  NewStudent,
  PlanningRepository,
  PreparationPlanRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

function toRecord(row: typeof preparationPlans.$inferSelect): PreparationPlanRecord {
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

export function createDrizzlePlanningRepository(db: DrizzleDb): PlanningRepository {
  return {
    async createFamily(input: NewFamily) {
      const [row] = await db.insert(families).values({ name: input.name }).returning({ id: families.id });
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

    async createPlan(input: NewPreparationPlan) {
      assertPlanDateOrder(input);
      const [row] = await db
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
      return toRecord(row!);
    },

    async activatePlan(planId: string) {
      await db.transaction(async (tx) => {
        const [plan] = await tx
          .select({ academicYearId: preparationPlans.academicYearId })
          .from(preparationPlans)
          .where(eq(preparationPlans.id, planId));
        if (!plan) throw new Error(`preparation plan ${planId} not found`);

        // Archive whichever other plan is currently active for this year, then
        // activate this one. The partial unique index is the backstop.
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

    async listStudentsByFamily(familyId: string) {
      return db
        .select({ id: students.id, displayName: students.displayName })
        .from(students)
        .where(eq(students.familyId, familyId));
    },
  };
}
