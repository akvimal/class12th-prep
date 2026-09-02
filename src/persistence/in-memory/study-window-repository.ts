import { randomUUID } from 'node:crypto';
import { assertStudyWindow } from '@/domain/planning/study-window';
import type {
  NewStudyWindow,
  StudyWindowRecord,
  StudyWindowRepository,
  StudyWindowUpdate,
} from '@/persistence/ports';

export function createInMemoryStudyWindowRepository(): StudyWindowRepository {
  const rows = new Map<string, StudyWindowRecord>();

  return {
    async createWindow(input: NewStudyWindow) {
      assertStudyWindow(input);
      const record: StudyWindowRecord = {
        id: randomUUID(),
        academicYearId: input.academicYearId,
        dayType: input.dayType,
        startTime: input.startTime,
        endTime: input.endTime,
        label: input.label ?? null,
        enabled: input.enabled ?? true,
        reminderEnabled: input.reminderEnabled ?? true,
      };
      rows.set(record.id, record);
      return { ...record };
    },

    async updateWindow(windowId: string, patch: StudyWindowUpdate) {
      const row = rows.get(windowId);
      if (!row) throw new Error(`study window ${windowId} not found`);
      const next = { ...row, ...patch };
      assertStudyWindow(next);
      rows.set(windowId, next);
      return { ...next };
    },

    async deleteWindow(windowId: string) {
      rows.delete(windowId);
    },

    async listWindows(academicYearId: string) {
      return [...rows.values()]
        .filter((r) => r.academicYearId === academicYearId)
        .sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
        .map((r) => ({ ...r }));
    },
  };
}
