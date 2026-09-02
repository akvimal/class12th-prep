import { randomUUID } from 'node:crypto';
import type { AssessmentStatus } from '@/domain/assessment/assessment';
import type {
  AssessmentFilters,
  AssessmentRecord,
  AssessmentRepository,
  NewAssessment,
} from '@/persistence/ports';

export function createInMemoryAssessmentRepository(): AssessmentRepository {
  const rows = new Map<string, AssessmentRecord>();

  return {
    async createAssessment(input: NewAssessment) {
      if (input.chapterIds.length === 0) throw new Error('assessment must cover a chapter');
      const record: AssessmentRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        subjectId: input.subjectId,
        type: input.type,
        name: input.name,
        examDate: input.examDate,
        maxMarks: input.maxMarks ?? null,
        status: 'ANNOUNCED',
        chapterIds: [...new Set(input.chapterIds)],
      };
      rows.set(record.id, record);
      return { ...record, chapterIds: [...record.chapterIds] };
    },

    async getAssessment(assessmentId: string) {
      const r = rows.get(assessmentId);
      return r ? { ...r, chapterIds: [...r.chapterIds] } : null;
    },

    async listAssessments(academicYearId: string, filters: AssessmentFilters = {}) {
      return [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .filter((r) => (filters.from ? r.examDate >= filters.from : true))
        .filter((r) => (filters.to ? r.examDate <= filters.to : true))
        .filter((r) => (filters.status ? r.status === filters.status : true))
        .sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0))
        .map((r) => ({ ...r, chapterIds: [...r.chapterIds] }));
    },

    async setStatus(assessmentId: string, status: AssessmentStatus) {
      const r = rows.get(assessmentId);
      if (!r) throw new Error(`assessment ${assessmentId} not found`);
      r.status = status;
      return { ...r, chapterIds: [...r.chapterIds] };
    },
  };
}
