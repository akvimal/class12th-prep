import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { AssessmentStatus } from '@/domain/assessment/assessment';
import { assessmentChapters, assessments } from '@/persistence/schema';
import type {
  AssessmentFilters,
  AssessmentRecord,
  AssessmentRepository,
  NewAssessment,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof assessments.$inferSelect;

export function createDrizzleAssessmentRepository(db: DrizzleDb): AssessmentRepository {
  async function chaptersFor(ids: string[]): Promise<Map<string, string[]>> {
    if (ids.length === 0) return new Map();
    const links = await db
      .select()
      .from(assessmentChapters)
      .where(inArray(assessmentChapters.assessmentId, ids));
    const map = new Map<string, string[]>();
    for (const l of links) {
      const list = map.get(l.assessmentId) ?? [];
      list.push(l.chapterId);
      map.set(l.assessmentId, list);
    }
    return map;
  }

  function toRecord(row: Row, chapterIds: string[]): AssessmentRecord {
    return {
      id: row.id,
      academicYearId: row.academicYearId,
      subjectId: row.subjectId,
      type: row.type,
      name: row.name,
      examDate: row.examDate,
      maxMarks: row.maxMarks,
      status: row.status,
      chapterIds,
    };
  }

  async function loadOne(id: string): Promise<AssessmentRecord | null> {
    const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
    if (!row) return null;
    const map = await chaptersFor([id]);
    return toRecord(row, map.get(id) ?? []);
  }

  return {
    async createAssessment(input: NewAssessment) {
      const chapterIds = [...new Set(input.chapterIds)];
      if (chapterIds.length === 0) throw new Error('assessment must cover a chapter');

      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(assessments)
          .values({
            academicYearId: input.academicYearId,
            subjectId: input.subjectId,
            type: input.type,
            name: input.name,
            examDate: input.examDate,
            maxMarks: input.maxMarks ?? null,
          })
          .returning();
        await tx
          .insert(assessmentChapters)
          .values(chapterIds.map((chapterId) => ({ assessmentId: row!.id, chapterId })));
        return toRecord(row!, chapterIds);
      });
    },

    getAssessment: loadOne,

    async listAssessments(academicYearId: string, filters: AssessmentFilters = {}) {
      const clauses = [eq(assessments.academicYearId, academicYearId)];
      if (filters.from) clauses.push(gte(assessments.examDate, filters.from));
      if (filters.to) clauses.push(lte(assessments.examDate, filters.to));
      if (filters.status) clauses.push(eq(assessments.status, filters.status));

      const rows = await db
        .select()
        .from(assessments)
        .where(and(...clauses))
        .orderBy(asc(assessments.examDate));

      const map = await chaptersFor(rows.map((r) => r.id));
      return rows.map((r) => toRecord(r, map.get(r.id) ?? []));
    },

    async setStatus(assessmentId: string, status: AssessmentStatus) {
      const updated = await db
        .update(assessments)
        .set({ status })
        .where(eq(assessments.id, assessmentId))
        .returning({ id: assessments.id });
      if (updated.length === 0) throw new Error(`assessment ${assessmentId} not found`);
      const record = await loadOne(assessmentId);
      return record!;
    },
  };
}
