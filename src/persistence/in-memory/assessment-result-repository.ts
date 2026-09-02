import { randomUUID } from 'node:crypto';
import { advanceErrorState, type ErrorState, type ErrorTransition } from '@/domain/errors/errors';
import type {
  AssessmentResultRecord,
  AssessmentResultRepository,
  NewAssessmentResult,
  QuestionErrorRecord,
} from '@/persistence/ports';

export function createInMemoryAssessmentResultRepository(
  /** Reads assessment → academicYear to scope `listErrors`. */
  assessmentAcademicYear: (assessmentId: string) => Promise<string | null>,
): AssessmentResultRepository {
  const results = new Map<string, AssessmentResultRecord>();
  const errors = new Map<string, QuestionErrorRecord & { assessmentId: string }>();

  return {
    async recordResult(input: NewAssessmentResult) {
      if ([...results.values()].some((r) => r.assessmentId === input.assessmentId)) {
        throw new Error(`assessment ${input.assessmentId} already has a result`);
      }
      const resultId = randomUUID();
      const now = new Date().toISOString();
      const errorRecords: QuestionErrorRecord[] = input.errors.map((e) => {
        const rec: QuestionErrorRecord & { assessmentId: string } = {
          id: randomUUID(),
          assessmentResultId: resultId,
          assessmentId: input.assessmentId,
          subjectId: e.subjectId,
          chapterId: e.chapterId,
          marksLost: e.marksLost,
          errorType: e.errorType,
          state: 'NEW',
          notes: e.notes ?? null,
          retestDueDate: e.retestDueDate ?? null,
          createdAt: now,
        };
        errors.set(rec.id, rec);
        const { assessmentId: _drop, ...clean } = rec;
        return clean;
      });
      const record: AssessmentResultRecord = {
        id: resultId,
        assessmentId: input.assessmentId,
        score: input.score,
        maxMarks: input.maxMarks,
        timeTakenMinutes: input.timeTakenMinutes ?? null,
        recordedAt: now,
        errors: errorRecords,
      };
      results.set(resultId, record);
      return structuredClone(record);
    },

    async getResult(assessmentId: string) {
      const r = [...results.values()].find((x) => x.assessmentId === assessmentId);
      return r ? structuredClone(r) : null;
    },

    async listErrors(
      academicYearId: string,
      filters: { state?: ErrorState; chapterId?: string; limit?: number } = {},
    ) {
      const ayByAssessment = new Map<string, string | null>();
      const out: QuestionErrorRecord[] = [];
      for (const e of errors.values()) {
        if (!ayByAssessment.has(e.assessmentId)) {
          ayByAssessment.set(e.assessmentId, await assessmentAcademicYear(e.assessmentId));
        }
        if (ayByAssessment.get(e.assessmentId) !== academicYearId) continue;
        if (filters.state && e.state !== filters.state) continue;
        if (filters.chapterId && e.chapterId !== filters.chapterId) continue;
        const { assessmentId: _drop, ...clean } = e;
        out.push({ ...clean });
      }
      out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
      return filters.limit ? out.slice(0, filters.limit) : out;
    },

    async advanceError(
      errorId: string,
      transition: ErrorTransition,
      opts: { retestDueDate?: string | null } = {},
    ) {
      const e = errors.get(errorId);
      if (!e) throw new Error(`question error ${errorId} not found`);
      e.state = advanceErrorState(e.state, transition);
      if (transition === 'SCHEDULE_RETEST' && opts.retestDueDate !== undefined) {
        e.retestDueDate = opts.retestDueDate;
      }
      const result = results.get(e.assessmentResultId);
      if (result) {
        const idx = result.errors.findIndex((x) => x.id === errorId);
        if (idx >= 0)
          result.errors[idx] = {
            ...result.errors[idx]!,
            state: e.state,
            retestDueDate: e.retestDueDate,
          };
      }
      const { assessmentId: _drop, ...clean } = e;
      return { ...clean };
    },
  };
}
