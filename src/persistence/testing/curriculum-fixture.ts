import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CurriculumTree } from '@/app-services/curriculum-import';

/**
 * The synthetic curriculum used by TASK-003 tests and (later) the seed task.
 * Read from disk so it is never bundled into the app.
 */
const path = fileURLToPath(new URL('../../../fixtures/synthetic-curriculum.json', import.meta.url));

interface FixtureFile extends CurriculumTree {
  meta: { kind: string; official: boolean; warning: string };
}

export const syntheticCurriculumFile = JSON.parse(readFileSync(path, 'utf8')) as FixtureFile;

export const syntheticCurriculum: CurriculumTree = {
  version: syntheticCurriculumFile.version,
  subjects: syntheticCurriculumFile.subjects,
  publish: syntheticCurriculumFile.publish,
};
