import { and, desc, eq } from 'drizzle-orm';
import { advanceErrorState, type ErrorState, type ErrorTransition } from '@/domain/errors/errors';
import { assessmentResults, assessments, questionErrors } from '@/persistence/schema';
import type {
  AssessmentResultRecord,
  AssessmentResultRepository,
  NewAssessmentResult,
  QuestionErrorRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type ResultRow = typeof assessmentResults.$inferSelect;
type ErrorRow = typeof questionErrors.$inferSelect;

function toError(row: ErrorRow): QuestionErrorRecord {
  return {
    id: row.id,
    assessmentResultId: row.assessmentResultId,
    subjectId: row.subjectId,
    chapterId: row.chapterId,
    marksLost: row.marksLost,
    errorType: row.errorType,
    state: row.state,
    notes: row.notes,
    retestDueDate: row.retestDueDate,
    createdAt: row.createdAt.toISOString(),
  };
}

function toResult(row: ResultRow, errors: QuestionErrorRecord[]): AssessmentResultRecord {
  return {
    id: row.id,
    assessmentId: row.assessmentId,
    score: row.score,
    maxMarks: row.maxMarks,
    timeTakenMinutes: row.timeTakenMinutes,
    recordedAt: row.recordedAt.toISOString(),
    errors,
  };
}

export function createDrizzleAssessmentResultRepository(db: DrizzleDb): AssessmentResultRepository {
  return {
    async recordResult(input: NewAssessmentResult) {
      return db.transaction(async (tx) => {
        const [result] = await tx
          .insert(assessmentResults)
          .values({
            assessmentId: input.assessmentId,
            score: input.score,
            maxMarks: input.maxMarks,
            timeTakenMinutes: input.timeTakenMinutes ?? null,
          })
          .returning();

        let errors: QuestionErrorRecord[] = [];
        if (input.errors.length > 0) {
          const rows = await tx
            .insert(questionErrors)
            .values(
              input.errors.map((e) => ({
                assessmentResultId: result!.id,
                subjectId: e.subjectId,
                chapterId: e.chapterId,
                marksLost: e.marksLost,
                errorType: e.errorType,
                notes: e.notes ?? null,
                retestDueDate: e.retestDueDate ?? null,
              })),
            )
            .returning();
          errors = rows.map(toError);
        }
        return toResult(result!, errors);
      });
    },

    async getResult(assessmentId: string) {
      const [result] = await db
        .select()
        .from(assessmentResults)
        .where(eq(assessmentResults.assessmentId, assessmentId));
      if (!result) return null;
      const errs = await db
        .select()
        .from(questionErrors)
        .where(eq(questionErrors.assessmentResultId, result.id));
      return toResult(result, errs.map(toError));
    },

    async listErrors(
      academicYearId: string,
      filters: { state?: ErrorState; chapterId?: string; limit?: number } = {},
    ) {
      const clauses = [eq(assessments.academicYearId, academicYearId)];
      if (filters.state) clauses.push(eq(questionErrors.state, filters.state));
      if (filters.chapterId) clauses.push(eq(questionErrors.chapterId, filters.chapterId));

      const q = db
        .select({ error: questionErrors })
        .from(questionErrors)
        .innerJoin(
          assessmentResults,
          eq(questionErrors.assessmentResultId, assessmentResults.id),
        )
        .innerJoin(assessments, eq(assessmentResults.assessmentId, assessments.id))
        .where(and(...clauses))
        .orderBy(desc(questionErrors.createdAt));

      const rows = await (filters.limit ? q.limit(filters.limit) : q);
      return rows.map((r) => toError(r.error));
    },

    async advanceError(
      errorId: string,
      transition: ErrorTransition,
      opts: { retestDueDate?: string | null } = {},
    ) {
      const [current] = await db
        .select()
        .from(questionErrors)
        .where(eq(questionErrors.id, errorId));
      if (!current) throw new Error(`question error ${errorId} not found`);

      const nextState = advanceErrorState(current.state, transition);
      const [row] = await db
        .update(questionErrors)
        .set({
          state: nextState,
          ...(transition === 'SCHEDULE_RETEST' && opts.retestDueDate !== undefined
            ? { retestDueDate: opts.retestDueDate }
            : {}),
        })
        .where(eq(questionErrors.id, errorId))
        .returning();
      return toError(row!);
    },
  };
}
