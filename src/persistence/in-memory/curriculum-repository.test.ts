import { describe, expect, it } from 'vitest';
import { importCurriculum } from '@/app-services/curriculum-import';
import { WeightProvenanceError } from '@/domain/curriculum/provenance';
import { syntheticCurriculum } from '@/persistence/testing/curriculum-fixture';
import { createInMemoryCurriculumRepository } from './curriculum-repository';

describe('in-memory curriculum repository', () => {
  it('loads the synthetic curriculum and returns an ordered hierarchy with provenance', async () => {
    const repo = createInMemoryCurriculumRepository();
    const { versionId, counts } = await importCurriculum(repo, syntheticCurriculum);
    expect(counts.chapters).toBe(6);

    const tree = await repo.getHierarchy(versionId);
    expect(tree.map((s) => s.name)).toEqual(['Physics', 'Mathematics']);
    expect(tree[0]!.units[0]!.chapters[0]!.topics.map((t) => t.key)).toEqual([
      'PHY01-T1',
      'PHY01-T2',
      'PHY01-T3',
    ]);
    expect(tree[0]!.units[0]!.weights[0]).toMatchObject({ sourceType: 'OFFICIAL', value: 16 });
  });

  it('getSubjectHierarchy returns one subtree', async () => {
    const repo = createInMemoryCurriculumRepository();
    const { versionId } = await importCurriculum(repo, syntheticCurriculum);
    const tree = await repo.getHierarchy(versionId);
    const maths = await repo.getSubjectHierarchy(tree[1]!.id);
    expect(maths?.name).toBe('Mathematics');
  });

  it('rejects an OFFICIAL weight with no reference', async () => {
    const repo = createInMemoryCurriculumRepository();
    const { id: versionId } = await repo.createVersion({
      board: 'CBSE',
      grade: 12,
      academicYearLabel: '2026-27',
      version: 'v1',
    });
    const { id: subjectId } = await repo.addSubject({
      curriculumVersionId: versionId,
      key: 'PHY',
      name: 'Physics',
      position: 0,
    });
    await expect(
      repo.addWeight({
        scope: { type: 'SUBJECT', subjectId },
        value: 1,
        unit: 'MARKS',
        sourceType: 'OFFICIAL',
        effectiveFrom: '2026-04-01',
      }),
    ).rejects.toBeInstanceOf(WeightProvenanceError);
  });
});
