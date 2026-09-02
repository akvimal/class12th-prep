import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { assertSession } from '@/domain/progress/study-session';
import { studySessions } from '@/persistence/schema';
import type {
  NewStudySession,
  SessionFilters,
  SessionRepository,
  StudySessionRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof studySessions.$inferSelect;

function toRecord(row: Row): StudySessionRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    subjectId: row.subjectId,
    chapterId: row.chapterId,
    studyTaskId: row.studyTaskId,
    type: row.type,
    completion: row.completion,
    sessionDate: row.sessionDate,
    plannedMinutes: row.plannedMinutes,
    actualMinutes: row.actualMinutes,
    attempted: row.attempted,
    correct: row.correct,
    confidenceAfter: row.confidenceAfter,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDrizzleSessionRepository(db: DrizzleDb): SessionRepository {
  return {
    async recordSession(input: NewStudySession) {
      assertSession(input);
      const [row] = await db
        .insert(studySessions)
        .values({
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
          startedAt: input.startedAt ? new Date(input.startedAt) : null,
          endedAt: input.endedAt ? new Date(input.endedAt) : null,
          notes: input.notes ?? null,
        })
        .returning();
      return toRecord(row!);
    },

    async getSession(sessionId: string) {
      const [row] = await db.select().from(studySessions).where(eq(studySessions.id, sessionId));
      return row ? toRecord(row) : null;
    },

    async listSessions(academicYearId: string, filters: SessionFilters = {}) {
      const clauses = [eq(studySessions.academicYearId, academicYearId)];
      if (filters.from) clauses.push(gte(studySessions.sessionDate, filters.from));
      if (filters.to) clauses.push(lte(studySessions.sessionDate, filters.to));
      if (filters.subjectId) clauses.push(eq(studySessions.subjectId, filters.subjectId));
      if (filters.chapterId) clauses.push(eq(studySessions.chapterId, filters.chapterId));
      if (filters.type) clauses.push(eq(studySessions.type, filters.type));

      const rows = await db
        .select()
        .from(studySessions)
        .where(and(...clauses))
        .orderBy(desc(studySessions.sessionDate), asc(studySessions.createdAt));
      return rows.map(toRecord);
    },
  };
}
