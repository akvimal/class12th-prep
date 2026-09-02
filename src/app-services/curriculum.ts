import type { CurriculumVersionView, SubjectNode } from '@/domain/curriculum/hierarchy';
import type { Repositories } from '@/persistence/ports';

type WithCurriculum = Pick<Repositories, 'curriculum'>;

export function listCurriculumVersions(repos: WithCurriculum): Promise<CurriculumVersionView[]> {
  return repos.curriculum.listVersions();
}

export interface CurriculumHierarchyResult {
  version: CurriculumVersionView;
  subjects: SubjectNode[];
}

/** Returns null when the version does not exist. */
export async function getCurriculumHierarchy(
  repos: WithCurriculum,
  versionId: string,
): Promise<CurriculumHierarchyResult | null> {
  const version = await repos.curriculum.getVersion(versionId);
  if (!version) return null;
  const subjects = await repos.curriculum.getHierarchy(versionId);
  return { version, subjects };
}
