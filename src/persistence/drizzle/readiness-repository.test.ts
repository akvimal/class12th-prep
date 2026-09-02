import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  calculateChapterReadiness,
  getChapterReadiness,
  recalculateAcademicYearReadiness,
} from '@/app-services/readiness';
import { academicYears, readinessSnapshots } from '@/persistence/schema';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzleCurriculumRepository } from './curriculum-repository';
import { createDrizzlePlanningRepository } from './planning-repository';
import { createDrizzleProgressRepository } from './progress-repository';
import { createDrizzleReadinessRepository } from './readiness-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let academicYearId: string;
let versionId: string;
let repos: {
  readiness: ReturnType<typeof createDrizzleReadinessRepository>;
  progress: ReturnType<typeof createDrizzleProgressRepository>;
  planning: ReturnType<typeof createDrizzlePlanningRepository>;
  curriculum: ReturnType<typeof createDrizzleCurriculumRepository>;
};

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  const seed = await seedTestDatabase(db);
  academicYearId = seed.academicYearId!;
  versionId = seed.curriculumVersionId;
  repos = {
    readiness: createDrizzleReadinessRepository(db),
    progress: createDrizzleProgressRepository(db),
    planning: createDrizzlePlanningRepository(db),
    curriculum: createDrizzleCurriculumRepository(db),
  };
});

async function chapter(key: string) {
  const tree = await repos.curriculum.getHierarchy(versionId);
  for (const s of tree) for (const u of s.units) for (const c of u.chapters) if (c.key === key) return c.id;
  throw new Error(key);
}

describe('readiness snapshots', () => {
  it('the seed computed one CHAPTER snapshot per chapter and cached the value on progress', async () => {
    const snaps = await repos.readiness.latestByScope(academicYearId, 'CHAPTER');
    expect(snaps).toHaveLength(12);

    // fixture: PHY01 readiness 45 with equal components -> raw 45, factor 1, effective 45
    const phy01 = await chapter('PHY01');
    const latest = await repos.readiness.getLatestSnapshot(academicYearId, 'CHAPTER', phy01);
    expect(latest).toMatchObject({ raw: 45, recencyFactor: 1, readiness: 45 });
    expect((await repos.progress.getChapterProgress(academicYearId, phy01))?.effectiveReadiness).toBe(45);
  });

  it('recalculation appends — no snapshot is ever overwritten', async () => {
    const phy01 = await chapter('PHY01');
    const before = await repos.readiness.listSnapshots(academicYearId, {
      scopeType: 'CHAPTER',
      scopeId: phy01,
    });
    expect(before).toHaveLength(1);

    await calculateChapterReadiness(repos, academicYearId, phy01, { asOf: '2026-09-10' });
    await calculateChapterReadiness(repos, academicYearId, phy01, { asOf: '2026-09-20' });

    const after = await repos.readiness.listSnapshots(academicYearId, {
      scopeType: 'CHAPTER',
      scopeId: phy01,
    });
    expect(after).toHaveLength(3);
    // the original row is still there, untouched
    expect(after.find((s) => s.id === before[0]!.id)).toEqual(before[0]);
  });

  it('is deterministic — same components, config and date give the same numbers', async () => {
    const phy01 = await chapter('PHY01');
    const a = await calculateChapterReadiness(repos, academicYearId, phy01, {
      asOf: '2026-09-15',
      persist: false,
    });
    const b = await calculateChapterReadiness(repos, academicYearId, phy01, {
      asOf: '2026-09-15',
      persist: false,
    });
    expect(a!.result).toEqual(b!.result);
  });

  it('lets readiness fall when test evidence is weak, regardless of confidence', async () => {
    const phy02 = await chapter('PHY02'); // seed: readiness 72
    await repos.progress.setChapterProgress(academicYearId, phy02, {
      confidence: 'STRONG',
      testScore: 20,
    });
    const result = await calculateChapterReadiness(repos, academicYearId, phy02, {
      asOf: '2026-09-02',
    });
    // components now 72/72/20/72/72 -> 72*.2+72*.25+20*.3+72*.15+72*.1 = 14.4+18+6+10.8+7.2 = 56.4
    expect(result!.result.raw).toBe(56.4);
    expect(result!.result.effective).toBeLessThan(72);
  });

  it('applies recency decay once a revision date is set', async () => {
    const cs01 = await chapter('CS01'); // seed: readiness 90
    await repos.progress.setChapterProgress(academicYearId, cs01, {
      lastRevisedAt: '2026-08-01T09:00:00.000Z',
    });
    const result = await calculateChapterReadiness(repos, academicYearId, cs01, {
      asOf: '2026-09-20', // 50 days later -> factor 0.75
    });
    expect(result!.result.recencyFactor).toBe(0.75);
    expect(result!.result.effective).toBe(67.5); // 90 * 0.75
  });

  it('recalculateAcademicYearReadiness processes every chapter with progress', async () => {
    const summary = await recalculateAcademicYearReadiness(repos, academicYearId, {
      asOf: '2026-09-30',
    });
    expect(summary).toMatchObject({ chaptersProcessed: 12, algorithmVersion: 'readiness-v1' });

    const history = await getChapterReadiness(repos, academicYearId, await chapter('MAT02'));
    expect(history!.history.length).toBeGreaterThanOrEqual(2); // seed + this recalc
    expect(history!.latest?.calculatedFor).toBe('2026-09-30');
  });

  it('rejects an out-of-range readiness value at the DB CHECK', async () => {
    await expect(
      db.insert(readinessSnapshots).values({
        academicYearId,
        scopeType: 'CHAPTER',
        scopeId: await chapter('PHY01'),
        readiness: 150,
        raw: 50,
        recencyFactor: 1,
        componentJson: {},
        algorithmVersion: 'x',
        calculatedFor: '2026-09-02',
      }),
    ).rejects.toThrow();
  });

  it('cascades when the academic year is deleted', async () => {
    await db.delete(academicYears).where(eq(academicYears.id, academicYearId));
    expect(await db.select().from(readinessSnapshots)).toHaveLength(0);
  });
});
