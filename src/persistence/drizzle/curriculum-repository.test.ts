import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { importCurriculum } from '@/app-services/curriculum-import';
import { WeightProvenanceError } from '@/domain/curriculum/provenance';
import {
  academicYears,
  chapters,
  curriculumVersions,
  families,
  students,
  subjects,
} from '@/persistence/schema';
import { syntheticCurriculum } from '@/persistence/testing/curriculum-fixture';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import type { DrizzleDb } from './db';
import { createDrizzleCurriculumRepository } from './curriculum-repository';

let db: DrizzleDb;
let close: () => Promise<void>;
let repo: ReturnType<typeof createDrizzleCurriculumRepository>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  repo = createDrizzleCurriculumRepository(db);
});

const baseVersion = {
  board: 'CBSE',
  grade: 12,
  academicYearLabel: '2026-27',
  version: 'v1',
  sourceReference: 'ref',
};

describe('curriculum versions', () => {
  it('allows two versions for the same board/grade/year with different version strings', async () => {
    await repo.createVersion({ ...baseVersion, version: 'v1' });
    await expect(repo.createVersion({ ...baseVersion, version: 'v2' })).resolves.toBeDefined();
    expect(await repo.listVersions()).toHaveLength(2);
  });

  it('rejects a colliding version identity', async () => {
    await repo.createVersion({ ...baseVersion, version: 'v1' });
    await expect(repo.createVersion({ ...baseVersion, version: 'v1' })).rejects.toThrow();
  });

  it('publishVersion sets publishedAt', async () => {
    const { id } = await repo.createVersion(baseVersion);
    expect((await repo.getVersion(id))?.publishedAt).toBeNull();
    await repo.publishVersion(id);
    expect((await repo.getVersion(id))?.publishedAt).not.toBeNull();
  });
});

describe('loading the synthetic curriculum', () => {
  it('imports the whole tree and reports counts', async () => {
    const result = await importCurriculum(repo, syntheticCurriculum);
    expect(result.counts).toEqual({ subjects: 2, units: 4, chapters: 6, topics: 12, weights: 7 });
    expect((await repo.getVersion(result.versionId))?.publishedAt).not.toBeNull();
  });

  it('retrieves subject -> unit -> chapter -> topic in deterministic order with provenance', async () => {
    const { versionId } = await importCurriculum(repo, syntheticCurriculum);
    const tree = await repo.getHierarchy(versionId);

    expect(tree.map((s) => s.name)).toEqual(['Physics', 'Mathematics']);

    const physics = tree[0]!;
    expect(physics.units.map((u) => u.name)).toEqual(['Electrostatics', 'Current Electricity']);
    expect(physics.units[0]!.chapters.map((c) => c.name)).toEqual([
      'Electric Charges and Fields',
      'Electrostatic Potential and Capacitance',
    ]);
    expect(physics.units[0]!.chapters[0]!.topics.map((t) => t.key)).toEqual([
      'PHY01-T1',
      'PHY01-T2',
      'PHY01-T3',
    ]);

    // provenance is visible and OFFICIAL vs derived stay distinct
    const unitWeight = physics.units[0]!.weights[0]!;
    expect(unitWeight).toMatchObject({ sourceType: 'OFFICIAL', unit: 'MARKS', value: 16 });
    expect(unitWeight.sourceReference).toContain('SYNTHETIC://');

    const chapterWeight = physics.units[0]!.chapters[0]!.weights[0]!;
    expect(chapterWeight).toMatchObject({ sourceType: 'DERIVED_PYQ', confidence: 0.7 });
    expect(chapterWeight.sourceReference).toBeNull();
  });

  it('is a stable second import into a new version', async () => {
    await importCurriculum(repo, syntheticCurriculum);
    await expect(
      importCurriculum(repo, {
        ...syntheticCurriculum,
        version: { ...syntheticCurriculum.version, version: 'synthetic-v2' },
      }),
    ).resolves.toBeDefined();
  });
});

describe('academic weight provenance', () => {
  async function aChapter() {
    const { id: versionId } = await repo.createVersion(baseVersion);
    const { id: subjectId } = await repo.addSubject({
      curriculumVersionId: versionId,
      key: 'PHY',
      name: 'Physics',
      position: 0,
    });
    const { id: unitId } = await repo.addUnit({ subjectId, key: 'U1', name: 'Unit 1', position: 0 });
    const { id: chapterId } = await repo.addChapter({ unitId, key: 'C1', name: 'Ch 1', position: 0 });
    return { versionId, subjectId, chapterId };
  }

  it('rejects an OFFICIAL weight with no source reference (domain guard)', async () => {
    const { chapterId } = await aChapter();
    await expect(
      repo.addWeight({
        scope: { type: 'CHAPTER', chapterId },
        value: 5,
        unit: 'MARKS',
        sourceType: 'OFFICIAL',
        effectiveFrom: '2026-04-01',
      }),
    ).rejects.toBeInstanceOf(WeightProvenanceError);
  });

  it('accepts all five source types', async () => {
    const { subjectId } = await aChapter();
    for (const sourceType of ['OFFICIAL', 'DERIVED_SQP', 'DERIVED_PYQ', 'SCHOOL_TEACHER', 'USER'] as const) {
      await expect(
        repo.addWeight({
          scope: { type: 'SUBJECT', subjectId },
          value: 1,
          unit: 'RELATIVE',
          sourceType,
          sourceReference: sourceType === 'OFFICIAL' ? 'ref' : null,
          confidence: sourceType.startsWith('DERIVED') ? 0.5 : null,
          effectiveFrom: '2026-04-01',
        }),
      ).resolves.toBeDefined();
    }
  });
});

describe('referential integrity', () => {
  it('cascades a version delete down to weights', async () => {
    const { versionId } = await importCurriculum(repo, syntheticCurriculum);
    await db.delete(curriculumVersions).where(eq(curriculumVersions.id, versionId));
    expect(await db.select().from(subjects)).toHaveLength(0);
    expect(await db.select().from(chapters)).toHaveLength(0);
  });

  it('blocks deleting a curriculum version an academic year still references (RESTRICT)', async () => {
    const { versionId } = await importCurriculum(repo, syntheticCurriculum);

    const [family] = await db.insert(families).values({ name: 'F' }).returning({ id: families.id });
    const [student] = await db
      .insert(students)
      .values({ familyId: family!.id, displayName: 'S', board: 'CBSE', grade: 12 })
      .returning({ id: students.id });
    await db.insert(academicYears).values({
      studentId: student!.id,
      yearLabel: '2026-27',
      curriculumVersionId: versionId,
      startDate: '2026-04-01',
      endDate: '2027-03-31',
    });

    await expect(
      db.delete(curriculumVersions).where(eq(curriculumVersions.id, versionId)),
    ).rejects.toThrow();
  });
});
