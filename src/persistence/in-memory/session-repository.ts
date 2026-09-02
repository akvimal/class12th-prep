import { randomUUID } from 'node:crypto';
import { assertSession } from '@/domain/progress/study-session';
import type {
  NewStudySession,
  SessionFilters,
  SessionRepository,
  StudySessionRecord,
} from '@/persistence/ports';

export function createInMemorySessionRepository(): SessionRepository {
  const sessions = new Map<string, StudySessionRecord>();

  return {
    async recordSession(input: NewStudySession) {
      assertSession(input);
      const record: StudySessionRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        subjectId: input.subjectId ?? null,
        chapterId: input.chapterId ?? null,
        studyTaskId: input.studyTaskId ?? null,
        type: input.type,
        completion: input.completion,
        sessionDate: input.sessionDate,
        plannedMinutes: input.plannedMinutes ?? null,
        actualMinutes: input.actualMinutes,
        attempted: input.attempted ?? null,
        correct: input.correct ?? null,
        confidenceAfter: input.confidenceAfter ?? null,
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
      };
      sessions.set(record.id, record);
      return { ...record };
    },

    async getSession(sessionId: string) {
      const s = sessions.get(sessionId);
      return s ? { ...s } : null;
    },

    async listSessions(academicYearId: string, filters: SessionFilters = {}) {
      return [...sessions.values()]
        .filter((s) => s.academicYearId === academicYearId)
        .filter((s) => (filters.from ? s.sessionDate >= filters.from : true))
        .filter((s) => (filters.to ? s.sessionDate <= filters.to : true))
        .filter((s) => (filters.subjectId ? s.subjectId === filters.subjectId : true))
        .filter((s) => (filters.chapterId ? s.chapterId === filters.chapterId : true))
        .filter((s) => (filters.type ? s.type === filters.type : true))
        .sort((a, b) =>
          a.sessionDate > b.sessionDate
            ? -1
            : a.sessionDate < b.sessionDate
              ? 1
              : a.createdAt < b.createdAt
                ? -1
                : 1,
        )
        .map((s) => ({ ...s }));
    },
  };
}
