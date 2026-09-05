import { randomUUID } from 'node:crypto';
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

export function createInMemorySatPrepRepository(): SatPrepRepository {
  const attempts = new Map<string, SatAttemptRecord>();
  const plans = new Map<string, SatPrepPlanRecord>();
  const sessions = new Map<string, SatPrepSessionRecord>();

  return {
    async addAttempt(input: NewSatAttempt) {
      const record: SatAttemptRecord = {
        id: randomUUID(),
        studentId: input.studentId,
        attemptNumber: input.attemptNumber,
        testDate: input.testDate,
        totalScore: input.totalScore,
        readingWritingScore: input.readingWritingScore,
        mathScore: input.mathScore,
        domainScores: input.domainScores.map((s) => ({ ...s, id: randomUUID() })),
        createdAt: new Date().toISOString(),
      };
      attempts.set(record.id, record);
      return { ...record, domainScores: record.domainScores.map((s) => ({ ...s })) };
    },

    async listAttempts(studentId: string) {
      return [...attempts.values()]
        .filter((a) => a.studentId === studentId)
        .sort((a, b) => a.attemptNumber - b.attemptNumber)
        .map((a) => ({ ...a, domainScores: a.domainScores.map((s) => ({ ...s })) }));
    },

    async createPlan(input: NewSatPrepPlan) {
      if (
        [...plans.values()].some((p) => p.studentId === input.studentId && p.status === 'ACTIVE')
      ) {
        throw new Error(`student ${input.studentId} already has an active SAT prep plan`);
      }
      const now = new Date().toISOString();
      const record: SatPrepPlanRecord = {
        id: randomUUID(),
        studentId: input.studentId,
        testDate: input.testDate,
        startDate: input.startDate,
        weeklyTargetMinutes: input.weeklyTargetMinutes,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      plans.set(record.id, record);
      return { ...record };
    },

    async getActivePlan(studentId: string) {
      const plan = [...plans.values()].find(
        (p) => p.studentId === studentId && p.status === 'ACTIVE',
      );
      return plan ? { ...plan } : null;
    },

    async updatePlan(planId: string, patch: SatPrepPlanUpdate) {
      const plan = plans.get(planId);
      if (!plan) throw new Error(`SAT prep plan ${planId} not found`);
      if (patch.weeklyTargetMinutes !== undefined)
        plan.weeklyTargetMinutes = patch.weeklyTargetMinutes;
      if (patch.status !== undefined) plan.status = patch.status;
      plan.updatedAt = new Date().toISOString();
      return { ...plan };
    },

    async recordSession(input: NewSatPrepSession) {
      const record: SatPrepSessionRecord = {
        id: randomUUID(),
        planId: input.planId,
        domain: input.domain ?? null,
        sessionDate: input.sessionDate,
        actualMinutes: input.actualMinutes,
        fullPracticeTest: input.fullPracticeTest ?? false,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      sessions.set(record.id, record);
      return { ...record };
    },

    async listSessions(planId: string) {
      return [...sessions.values()]
        .filter((s) => s.planId === planId)
        .sort((a, b) =>
          a.sessionDate < b.sessionDate ? 1 : a.sessionDate > b.sessionDate ? -1 : 0,
        )
        .map((s) => ({ ...s }));
    },
  };
}
