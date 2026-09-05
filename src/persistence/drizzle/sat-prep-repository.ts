import { and, desc, eq } from 'drizzle-orm';
import { satAttempts, satDomainScores, satPrepPlans, satPrepSessions } from '@/persistence/schema';
import type {
  NewSatAttempt,
  NewSatPrepPlan,
  NewSatPrepSession,
  SatAttemptRecord,
  SatPrepPlanRecord,
  SatPrepPlanUpdate,
  SatPrepRepository,
  SatPrepSessionRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type AttemptRow = typeof satAttempts.$inferSelect;
type DomainScoreRow = typeof satDomainScores.$inferSelect;
type PlanRow = typeof satPrepPlans.$inferSelect;
type SessionRow = typeof satPrepSessions.$inferSelect;

function toAttemptRecord(row: AttemptRow, scores: DomainScoreRow[]): SatAttemptRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    attemptNumber: row.attemptNumber,
    testDate: row.testDate,
    totalScore: row.totalScore,
    readingWritingScore: row.readingWritingScore,
    mathScore: row.mathScore,
    domainScores: scores.map((s) => ({
      id: s.id,
      domain: s.domain,
      performanceLow: s.performanceLow,
      performanceHigh: s.performanceHigh,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

function toPlanRecord(row: PlanRow): SatPrepPlanRecord {
  return {
    id: row.id,
    studentId: row.studentId,
    testDate: row.testDate,
    startDate: row.startDate,
    weeklyTargetMinutes: row.weeklyTargetMinutes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSessionRecord(row: SessionRow): SatPrepSessionRecord {
  return {
    id: row.id,
    planId: row.planId,
    domain: row.domain,
    sessionDate: row.sessionDate,
    actualMinutes: row.actualMinutes,
    fullPracticeTest: row.fullPracticeTest,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDrizzleSatPrepRepository(db: DrizzleDb): SatPrepRepository {
  return {
    async addAttempt(input: NewSatAttempt) {
      return db.transaction(async (tx) => {
        const [attempt] = await tx
          .insert(satAttempts)
          .values({
            studentId: input.studentId,
            attemptNumber: input.attemptNumber,
            testDate: input.testDate,
            totalScore: input.totalScore,
            readingWritingScore: input.readingWritingScore,
            mathScore: input.mathScore,
          })
          .returning();

        const scores =
          input.domainScores.length > 0
            ? await tx
                .insert(satDomainScores)
                .values(
                  input.domainScores.map((s) => ({
                    attemptId: attempt!.id,
                    domain: s.domain,
                    performanceLow: s.performanceLow,
                    performanceHigh: s.performanceHigh,
                  })),
                )
                .returning()
            : [];

        return toAttemptRecord(attempt!, scores);
      });
    },

    async listAttempts(studentId: string) {
      const rows = await db
        .select()
        .from(satAttempts)
        .where(eq(satAttempts.studentId, studentId))
        .orderBy(satAttempts.attemptNumber);

      const results: SatAttemptRecord[] = [];
      for (const row of rows) {
        const scores = await db
          .select()
          .from(satDomainScores)
          .where(eq(satDomainScores.attemptId, row.id));
        results.push(toAttemptRecord(row, scores));
      }
      return results;
    },

    async createPlan(input: NewSatPrepPlan) {
      const [row] = await db
        .insert(satPrepPlans)
        .values({
          studentId: input.studentId,
          testDate: input.testDate,
          startDate: input.startDate,
          weeklyTargetMinutes: input.weeklyTargetMinutes,
        })
        .returning();
      return toPlanRecord(row!);
    },

    async getActivePlan(studentId: string) {
      const [row] = await db
        .select()
        .from(satPrepPlans)
        .where(and(eq(satPrepPlans.studentId, studentId), eq(satPrepPlans.status, 'ACTIVE')));
      return row ? toPlanRecord(row) : null;
    },

    async updatePlan(planId: string, patch: SatPrepPlanUpdate) {
      const [row] = await db
        .update(satPrepPlans)
        .set({
          ...(patch.weeklyTargetMinutes !== undefined
            ? { weeklyTargetMinutes: patch.weeklyTargetMinutes }
            : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        })
        .where(eq(satPrepPlans.id, planId))
        .returning();
      if (!row) throw new Error(`SAT prep plan ${planId} not found`);
      return toPlanRecord(row);
    },

    async recordSession(input: NewSatPrepSession) {
      const [row] = await db
        .insert(satPrepSessions)
        .values({
          planId: input.planId,
          domain: input.domain ?? null,
          sessionDate: input.sessionDate,
          actualMinutes: input.actualMinutes,
          fullPracticeTest: input.fullPracticeTest ?? false,
          notes: input.notes ?? null,
        })
        .returning();
      return toSessionRecord(row!);
    },

    async listSessions(planId: string) {
      const rows = await db
        .select()
        .from(satPrepSessions)
        .where(eq(satPrepSessions.planId, planId))
        .orderBy(desc(satPrepSessions.sessionDate));
      return rows.map(toSessionRecord);
    },
  };
}
