import { asc, eq } from 'drizzle-orm';
import { assertStudyWindow } from '@/domain/planning/study-window';
import { studyWindows } from '@/persistence/schema';
import type {
  NewStudyWindow,
  StudyWindowRecord,
  StudyWindowRepository,
  StudyWindowUpdate,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof studyWindows.$inferSelect;

/** Postgres `time` comes back as HH:MM:SS; the domain works in HH:MM. */
function hhmm(value: string): string {
  return value.slice(0, 5);
}

function toRecord(row: Row): StudyWindowRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    dayType: row.dayType,
    startTime: hhmm(row.startTime),
    endTime: hhmm(row.endTime),
    label: row.label,
    enabled: row.enabled,
    reminderEnabled: row.reminderEnabled,
  };
}

export function createDrizzleStudyWindowRepository(db: DrizzleDb): StudyWindowRepository {
  return {
    async createWindow(input: NewStudyWindow) {
      assertStudyWindow(input);
      const [row] = await db
        .insert(studyWindows)
        .values({
          academicYearId: input.academicYearId,
          dayType: input.dayType,
          startTime: input.startTime,
          endTime: input.endTime,
          label: input.label ?? null,
          ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
          ...(input.reminderEnabled === undefined ? {} : { reminderEnabled: input.reminderEnabled }),
        })
        .returning();
      return toRecord(row!);
    },

    async updateWindow(windowId: string, patch: StudyWindowUpdate) {
      const [current] = await db.select().from(studyWindows).where(eq(studyWindows.id, windowId));
      if (!current) throw new Error(`study window ${windowId} not found`);
      const next = { ...toRecord(current), ...patch };
      assertStudyWindow(next);

      const [row] = await db
        .update(studyWindows)
        .set({
          dayType: next.dayType,
          startTime: next.startTime,
          endTime: next.endTime,
          label: next.label,
          enabled: next.enabled,
          reminderEnabled: next.reminderEnabled,
        })
        .where(eq(studyWindows.id, windowId))
        .returning();
      return toRecord(row!);
    },

    async deleteWindow(windowId: string) {
      await db.delete(studyWindows).where(eq(studyWindows.id, windowId));
    },

    async listWindows(academicYearId: string) {
      const rows = await db
        .select()
        .from(studyWindows)
        .where(eq(studyWindows.academicYearId, academicYearId))
        .orderBy(asc(studyWindows.startTime));
      return rows.map(toRecord);
    },
  };
}
