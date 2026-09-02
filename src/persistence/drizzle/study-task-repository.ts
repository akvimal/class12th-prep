import { and, asc, eq, notInArray, sql } from 'drizzle-orm';
import type { StudyTaskStatus } from '@/domain/planning/study-task';
import { studyTasks } from '@/persistence/schema';
import type {
  NewStudyTask,
  StudyTaskFilters,
  StudyTaskRecord,
  StudyTaskRepository,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof studyTasks.$inferSelect;

function toRecord(row: Row): StudyTaskRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    chapterId: row.chapterId,
    subjectId: row.subjectId,
    plannedDate: row.plannedDate,
    activity: row.activity as StudyTaskRecord['activity'],
    plannedMinutes: row.plannedMinutes,
    slot: row.slot,
    reasonCodes: row.reasonCodes ?? [],
    priorityScore: row.priorityScore,
    status: row.status,
    sourceSessionId: row.sourceSessionId,
    algorithmVersion: row.algorithmVersion,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

export function createDrizzleStudyTaskRepository(db: DrizzleDb): StudyTaskRepository {
  return {
    async saveDailyPlan(academicYearId, plannedDate, tasks: NewStudyTask[]) {
      return db.transaction(async (tx) => {
        const dayRows = await tx
          .select()
          .from(studyTasks)
          .where(
            and(
              eq(studyTasks.academicYearId, academicYearId),
              eq(studyTasks.plannedDate, plannedDate),
            ),
          );
        // A chapter already completed today is not re-proposed.
        const completed = new Set(
          dayRows.filter((r) => r.status === 'COMPLETED').map((r) => r.chapterId),
        );
        const pending = tasks.filter((t) => !completed.has(t.chapterId));

        const scoped = and(
          eq(studyTasks.academicYearId, academicYearId),
          eq(studyTasks.plannedDate, plannedDate),
          eq(studyTasks.status, 'SCHEDULED'),
        );
        const keepChapterIds = pending.map((t) => t.chapterId);

        // Cancel scheduled rows we're no longer proposing.
        await tx
          .update(studyTasks)
          .set({ status: 'CANCELLED', resolvedAt: new Date() })
          .where(
            keepChapterIds.length
              ? and(scoped, notInArray(studyTasks.chapterId, keepChapterIds))
              : scoped,
          );

        if (pending.length === 0) return [];

        const byChapter = new Map(
          dayRows.filter((r) => r.status === 'SCHEDULED').map((r) => [r.chapterId, r]),
        );
        const out: StudyTaskRecord[] = [];

        for (const task of pending) {
          const current = byChapter.get(task.chapterId);
          if (current) {
            const [row] = await tx
              .update(studyTasks)
              .set({
                subjectId: task.subjectId,
                activity: task.activity,
                plannedMinutes: task.plannedMinutes,
                slot: task.slot,
                reasonCodes: task.reasonCodes,
                priorityScore: task.priorityScore ?? null,
                algorithmVersion: task.algorithmVersion ?? null,
              })
              .where(eq(studyTasks.id, current.id))
              .returning();
            out.push(toRecord(row!));
            continue;
          }
          const [row] = await tx
            .insert(studyTasks)
            .values({
              academicYearId,
              chapterId: task.chapterId,
              subjectId: task.subjectId,
              plannedDate,
              activity: task.activity,
              plannedMinutes: task.plannedMinutes,
              slot: task.slot,
              reasonCodes: task.reasonCodes,
              priorityScore: task.priorityScore ?? null,
              algorithmVersion: task.algorithmVersion ?? null,
            })
            .returning();
          out.push(toRecord(row!));
        }
        return out;
      });
    },

    async listTasks(academicYearId: string, filters: StudyTaskFilters = {}) {
      const clauses = [eq(studyTasks.academicYearId, academicYearId)];
      if (filters.status) clauses.push(eq(studyTasks.status, filters.status));
      if (filters.chapterId) clauses.push(eq(studyTasks.chapterId, filters.chapterId));
      if (filters.plannedDate) clauses.push(eq(studyTasks.plannedDate, filters.plannedDate));
      if (filters.from) clauses.push(sql`${studyTasks.plannedDate} >= ${filters.from}`);
      if (filters.to) clauses.push(sql`${studyTasks.plannedDate} <= ${filters.to}`);
      const rows = await db
        .select()
        .from(studyTasks)
        .where(and(...clauses))
        .orderBy(asc(studyTasks.plannedDate), asc(studyTasks.createdAt));
      return rows.map(toRecord);
    },

    async resolve(
      taskId: string,
      status: Exclude<StudyTaskStatus, 'SCHEDULED'>,
      opts: { sourceSessionId?: string | null; resolvedAt?: string } = {},
    ) {
      const set: Partial<Row> = {
        status,
        resolvedAt: opts.resolvedAt ? new Date(opts.resolvedAt) : new Date(),
      };
      if (opts.sourceSessionId !== undefined) set.sourceSessionId = opts.sourceSessionId;
      const [row] = await db
        .update(studyTasks)
        .set(set)
        .where(eq(studyTasks.id, taskId))
        .returning();
      if (!row) throw new Error(`study task ${taskId} not found`);
      return toRecord(row);
    },

    async missedCountByChapter(academicYearId: string) {
      const rows = await db
        .select({
          chapterId: studyTasks.chapterId,
          count: sql<number>`count(*)::int`,
        })
        .from(studyTasks)
        .where(
          and(eq(studyTasks.academicYearId, academicYearId), eq(studyTasks.status, 'MISSED')),
        )
        .groupBy(studyTasks.chapterId);
      return Object.fromEntries(rows.map((r) => [r.chapterId, r.count]));
    },
  };
}
