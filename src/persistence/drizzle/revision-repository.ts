import { and, asc, eq, lte } from 'drizzle-orm';
import type { RevisionOutcome, RevisionStatus } from '@/domain/revision/revision';
import { revisionSchedules } from '@/persistence/schema';
import type {
  NewRevisionSchedule,
  RevisionFilters,
  RevisionRepository,
  RevisionScheduleRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof revisionSchedules.$inferSelect;

function toRecord(row: Row): RevisionScheduleRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    chapterId: row.chapterId,
    revisionNumber: row.revisionNumber,
    dueDate: row.dueDate,
    method: row.method,
    status: row.status,
    outcome: row.outcome,
    completedOn: row.completedOn,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDrizzleRevisionRepository(db: DrizzleDb): RevisionRepository {
  return {
    async schedule(input: NewRevisionSchedule) {
      const [row] = await db
        .insert(revisionSchedules)
        .values({
          academicYearId: input.academicYearId,
          chapterId: input.chapterId,
          revisionNumber: input.revisionNumber,
          dueDate: input.dueDate,
          method: input.method,
          algorithmVersion: input.algorithmVersion ?? null,
        })
        .returning();
      return toRecord(row!);
    },

    async getActive(academicYearId: string, chapterId: string) {
      const [row] = await db
        .select()
        .from(revisionSchedules)
        .where(
          and(
            eq(revisionSchedules.academicYearId, academicYearId),
            eq(revisionSchedules.chapterId, chapterId),
            eq(revisionSchedules.status, 'SCHEDULED'),
          ),
        );
      return row ? toRecord(row) : null;
    },

    async listSchedules(academicYearId: string, filters: RevisionFilters = {}) {
      const clauses = [eq(revisionSchedules.academicYearId, academicYearId)];
      if (filters.status) clauses.push(eq(revisionSchedules.status, filters.status));
      if (filters.chapterId) clauses.push(eq(revisionSchedules.chapterId, filters.chapterId));
      if (filters.dueOnOrBefore) {
        clauses.push(lte(revisionSchedules.dueDate, filters.dueOnOrBefore));
      }
      const q = db
        .select()
        .from(revisionSchedules)
        .where(and(...clauses))
        .orderBy(asc(revisionSchedules.dueDate));
      const rows = await (filters.limit ? q.limit(filters.limit) : q);
      return rows.map(toRecord);
    },

    async complete(
      scheduleId: string,
      input: { outcome: RevisionOutcome; completedOn: string; sourceSessionId?: string | null },
    ) {
      const [row] = await db
        .update(revisionSchedules)
        .set({
          status: 'DONE',
          outcome: input.outcome,
          completedOn: input.completedOn,
          sourceSessionId: input.sourceSessionId ?? null,
        })
        .where(eq(revisionSchedules.id, scheduleId))
        .returning();
      if (!row) throw new Error(`revision schedule ${scheduleId} not found`);
      return toRecord(row);
    },

    async setStatus(scheduleId: string, status: RevisionStatus) {
      const [row] = await db
        .update(revisionSchedules)
        .set({ status })
        .where(eq(revisionSchedules.id, scheduleId))
        .returning();
      if (!row) throw new Error(`revision schedule ${scheduleId} not found`);
      return toRecord(row);
    },
  };
}
