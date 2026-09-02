import { randomUUID } from 'node:crypto';
import type {
  NewReadinessSnapshot,
  ReadinessRepository,
  ReadinessScopeType,
  ReadinessSnapshotRecord,
} from '@/persistence/ports';

export function createInMemoryReadinessRepository(): ReadinessRepository {
  const snapshots: ReadinessSnapshotRecord[] = [];

  const forYear = (academicYearId: string) =>
    snapshots
      .filter((s) => s.academicYearId === academicYearId)
      .sort((a, b) =>
        a.calculatedAt < b.calculatedAt ? 1 : a.calculatedAt > b.calculatedAt ? -1 : 0,
      );

  return {
    async createSnapshot(input: NewReadinessSnapshot) {
      const record: ReadinessSnapshotRecord = {
        ...input,
        components: { ...input.components },
        id: randomUUID(),
        // monotonically increasing so newest-first ordering is stable within a test
        calculatedAt: new Date(Date.now() + snapshots.length).toISOString(),
      };
      snapshots.push(record);
      return { ...record, components: { ...record.components } };
    },

    async getLatestSnapshot(academicYearId, scopeType, scopeId) {
      const match = forYear(academicYearId).find(
        (s) => s.scopeType === scopeType && s.scopeId === scopeId,
      );
      return match ? { ...match, components: { ...match.components } } : null;
    },

    async listSnapshots(academicYearId, filters = {}) {
      let list = forYear(academicYearId);
      if (filters.scopeType) list = list.filter((s) => s.scopeType === filters.scopeType);
      if (filters.scopeId) list = list.filter((s) => s.scopeId === filters.scopeId);
      if (filters.limit) list = list.slice(0, filters.limit);
      return list.map((s) => ({ ...s, components: { ...s.components } }));
    },

    async latestByScope(academicYearId, scopeType: ReadinessScopeType) {
      const seen = new Set<string>();
      const out: ReadinessSnapshotRecord[] = [];
      for (const s of forYear(academicYearId)) {
        if (s.scopeType !== scopeType || seen.has(s.scopeId)) continue;
        seen.add(s.scopeId);
        out.push({ ...s, components: { ...s.components } });
      }
      return out;
    },
  };
}
