import type { CurriculumRepository, NewAcademicWeight, WeightScope } from '@/persistence/ports';

/**
 * Loads a full curriculum tree through the repository, following the import
 * workflow in docs/ACADEMIC_DATA.md: create version -> enter hierarchy ->
 * attach provenance -> publish. `position` is taken from array order.
 *
 * This is deliberately format-agnostic: real CBSE import automation is out of
 * scope (TASK-003). Callers pass a plain object (a fixture, a parsed upload).
 */

export interface WeightInput {
  value: number;
  unit: NewAcademicWeight['unit'];
  sourceType: NewAcademicWeight['sourceType'];
  sourceReference?: string | null;
  confidence?: number | null;
  effectiveFrom: string;
  retrievedAt?: string | null;
  parserVersion?: string | null;
}

export interface TopicInput {
  key: string;
  name: string;
  weights?: WeightInput[];
}

export interface ChapterInput {
  key: string;
  name: string;
  topics?: TopicInput[];
  weights?: WeightInput[];
}

export interface UnitInput {
  key: string;
  name: string;
  chapters?: ChapterInput[];
  weights?: WeightInput[];
}

export interface SubjectInput {
  key: string;
  name: string;
  code?: string | null;
  units?: UnitInput[];
  weights?: WeightInput[];
}

export interface CurriculumTree {
  version: {
    board: string;
    grade: number;
    academicYearLabel: string;
    version: string;
    sourceReference?: string | null;
  };
  subjects: SubjectInput[];
  /** Publish the version after loading. Default true. */
  publish?: boolean;
}

export interface CurriculumImportResult {
  versionId: string;
  counts: { subjects: number; units: number; chapters: number; topics: number; weights: number };
}

export async function importCurriculum(
  repo: CurriculumRepository,
  tree: CurriculumTree,
): Promise<CurriculumImportResult> {
  const { id: versionId } = await repo.createVersion(tree.version);
  const counts = { subjects: 0, units: 0, chapters: 0, topics: 0, weights: 0 };

  const addWeights = async (scope: WeightScope, list: WeightInput[] | undefined) => {
    for (const w of list ?? []) {
      await repo.addWeight({ scope, ...w });
      counts.weights += 1;
    }
  };

  for (const [si, subject] of tree.subjects.entries()) {
    const { id: subjectId } = await repo.addSubject({
      curriculumVersionId: versionId,
      key: subject.key,
      name: subject.name,
      code: subject.code ?? null,
      position: si,
    });
    counts.subjects += 1;
    await addWeights({ type: 'SUBJECT', subjectId }, subject.weights);

    for (const [ui, unit] of (subject.units ?? []).entries()) {
      const { id: unitId } = await repo.addUnit({
        subjectId,
        key: unit.key,
        name: unit.name,
        position: ui,
      });
      counts.units += 1;
      await addWeights({ type: 'UNIT', unitId }, unit.weights);

      for (const [ci, chapter] of (unit.chapters ?? []).entries()) {
        const { id: chapterId } = await repo.addChapter({
          unitId,
          key: chapter.key,
          name: chapter.name,
          position: ci,
        });
        counts.chapters += 1;
        await addWeights({ type: 'CHAPTER', chapterId }, chapter.weights);

        for (const [ti, topic] of (chapter.topics ?? []).entries()) {
          const { id: topicId } = await repo.addTopic({
            chapterId,
            key: topic.key,
            name: topic.name,
            position: ti,
          });
          counts.topics += 1;
          await addWeights({ type: 'TOPIC', topicId }, topic.weights);
        }
      }
    }
  }

  if (tree.publish !== false) {
    await repo.publishVersion(versionId);
  }

  return { versionId, counts };
}
