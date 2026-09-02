import type { CurriculumTree } from '@/app-services/curriculum-import';
import fixture from '../../../fixtures/synthetic-curriculum.json';

/**
 * The synthetic curriculum used by TASK-003 tests. Imported as JSON so it is
 * bundled rather than read from disk at runtime.
 */
interface FixtureFile extends CurriculumTree {
  meta: { kind: string; official: boolean; warning: string };
}

export const syntheticCurriculumFile = fixture as unknown as FixtureFile;

export const syntheticCurriculum: CurriculumTree = {
  version: syntheticCurriculumFile.version,
  subjects: syntheticCurriculumFile.subjects,
  publish: syntheticCurriculumFile.publish,
};
