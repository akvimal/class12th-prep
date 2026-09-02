import { and, desc, eq } from 'drizzle-orm';
import type { ReadinessComponents } from '@/domain/readiness/readiness';
import { readinessSnapshots } from '@/persistence/schema';
import type {
  NewReadinessSnapshot,
  ReadinessRepository,
  ReadinessScopeType,
  ReadinessSnapshotRecord,
} from '@/persistence/ports';
import type { DrizzleDb } from './db';

type Row = typeof readinessSnapshots.$inferSelect;

function toRecord(row: Row): ReadinessSnapshotRecord {
  return {
    id: row.id,
    academicYearId: row.academicYearId,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    readiness: row.readiness,
    raw: row.raw,
    recencyFactor: row.recencyFactor,
    components: row.componentJson as ReadinessComponents,
    algorithmVersion: row.algorithmVersion,
    calculatedFor: row.calculatedFor,
    calculatedAt: row.calculatedAt.toISOString(),
  };
}

export function createDrizzleReadinessRepository(db: DrizzleDb): ReadinessRepository {
  return {
    async createSnapshot(input: NewReadinessSnapshot) {
      const [row] = await db
        .insert(readinessSnapshots)
        .values({
          academicYearId: input.academicYearId,
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          readiness: input.readiness,
          raw: input.raw,
          recencyFactor: input.recencyFactor,
          componentJson: input.components,
          algorithmVersion: input.algorithmVersion,
          calculatedFor: input.calculatedFor,
        })
        .returning();
      return toRecord(row!);
    },

    async getLatestSnapshot(academicYearId, scopeType, scopeId) {
      const [row] = await db
        .select()
        .from(readinessSnapshots)
        .where(
          and(
            eq(readinessSnapshots.academicYearId, academicYearId),
            eq(readinessSnapshots.scopeType, scopeType),
            eq(readinessSnapshots.scopeId, scopeId),
          ),
        )
        .orderBy(desc(readinessSnapshots.calculatedAt))
        .limit(1);
      return row ? toRecord(row) : null;
    },

    async listSnapshots(academicYearId, filters = {}) {
      const clauses = [eq(readinessSnapshots.academicYearId, academicYearId)];
      if (filters.scopeType) clauses.push(eq(readinessSnapshots.scopeType, filters.scopeType));
      if (filters.scopeId) clauses.push(eq(readinessSnapshots.scopeId, filters.scopeId));

      const q = db
        .select()
        .from(readinessSnapshots)
        .where(and(...clauses))
        .orderBy(desc(readinessSnapshots.calculatedAt));
      const rows = filters.limit ? await q.limit(filters.limit) : await q;
      return rows.map(toRecord);
    },

    async latestByScope(academicYearId, scopeType: ReadinessScopeType) {
      // one row per scope_id — the most recent by calculated_at
      const rows = await db
        .select()
        .from(readinessSnapshots)
        .where(
          and(
            eq(readinessSnapshots.academicYearId, academicYearId),
            eq(readinessSnapshots.scopeType, scopeType),
          ),
        )
        .orderBy(readinessSnapshots.scopeId, desc(readinessSnapshots.calculatedAt));

      const seen = new Set<string>();
      const latest: Row[] = [];
      for (const row of rows) {
        if (seen.has(row.scopeId)) continue;
        seen.add(row.scopeId);
        latest.push(row);
      }
      return latest.map(toRecord);
    },
  };
}
