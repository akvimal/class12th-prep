import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { syntheticCurriculum } from '@/persistence/testing/curriculum-fixture';
import { importCurriculum } from './curriculum-import';
import { getCurriculumHierarchy, listCurriculumVersions } from './curriculum';

describe('curriculum read services', () => {
  it('returns null for an unknown version', async () => {
    const repos = createInMemoryRepositories();
    expect(await getCurriculumHierarchy(repos, 'missing')).toBeNull();
  });

  it('returns the version plus its subject tree', async () => {
    const repos = createInMemoryRepositories();
    const { versionId } = await importCurriculum(repos.curriculum, syntheticCurriculum);

    const result = await getCurriculumHierarchy(repos, versionId);
    expect(result?.version.board).toBe('CBSE');
    expect(result?.subjects.map((s) => s.name)).toEqual(['Physics', 'Mathematics']);

    expect((await listCurriculumVersions(repos)).map((v) => v.version)).toEqual(['synthetic-v1']);
  });
});
