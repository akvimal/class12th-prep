import { randomUUID } from 'node:crypto';
import { assertWeightProvenance } from '@/domain/curriculum/provenance';
import type {
  CurriculumVersionView,
  ChapterNode,
  SubjectNode,
  TopicNode,
  UnitNode,
  WeightView,
} from '@/domain/curriculum/hierarchy';
import type {
  CurriculumRepository,
  NewAcademicWeight,
  NewChapter,
  NewCurriculumVersion,
  NewSubject,
  NewTopic,
  NewUnit,
  WeightScope,
} from '@/persistence/ports';

interface VersionRec extends NewCurriculumVersion {
  id: string;
  publishedAt: string | null;
}
interface SubjectRec {
  id: string;
  versionId: string;
  key: string;
  name: string;
  code: string | null;
  position: number;
}
interface NodeRec {
  id: string;
  versionId: string;
  parentId: string;
  key: string;
  name: string;
  position: number;
}
interface WeightRec extends WeightView {
  versionId: string;
  scopeId: string;
}

const byPositionThenKey = <T extends { position: number; key: string }>(a: T, b: T) =>
  a.position - b.position || a.key.localeCompare(b.key);

export function createInMemoryCurriculumRepository(): CurriculumRepository {
  const versions = new Map<string, VersionRec>();
  const subjects = new Map<string, SubjectRec>();
  const units = new Map<string, NodeRec>();
  const chapters = new Map<string, NodeRec>();
  const topics = new Map<string, NodeRec>();
  const weights: WeightRec[] = [];

  const versionIdForScope = (scope: WeightScope): { versionId: string; scopeId: string } => {
    const lookup = (map: Map<string, { versionId: string }>, id: string, label: string) => {
      const rec = map.get(id);
      if (!rec) throw new Error(`${label} ${id} not found`);
      return { versionId: rec.versionId, scopeId: id };
    };
    switch (scope.type) {
      case 'SUBJECT':
        return lookup(subjects, scope.subjectId, 'subject');
      case 'UNIT':
        return lookup(units, scope.unitId, 'unit');
      case 'CHAPTER':
        return lookup(chapters, scope.chapterId, 'chapter');
      case 'TOPIC':
        return lookup(topics, scope.topicId, 'topic');
    }
  };

  const toView = (v: VersionRec): CurriculumVersionView => ({
    id: v.id,
    board: v.board,
    grade: v.grade,
    academicYearLabel: v.academicYearLabel,
    version: v.version,
    sourceReference: v.sourceReference ?? null,
    publishedAt: v.publishedAt,
  });

  const buildHierarchy = (versionId: string): SubjectNode[] => {
    const wById = new Map<string, WeightView[]>();
    for (const w of weights) {
      if (w.versionId !== versionId) continue;
      const list = wById.get(w.scopeId) ?? [];
      list.push({
        id: w.id,
        scopeType: w.scopeType,
        value: w.value,
        unit: w.unit,
        sourceType: w.sourceType,
        sourceReference: w.sourceReference,
        confidence: w.confidence,
        effectiveFrom: w.effectiveFrom,
      });
      wById.set(w.scopeId, list);
    }

    return [...subjects.values()]
      .filter((s) => s.versionId === versionId)
      .sort(byPositionThenKey)
      .map((s): SubjectNode => {
        const subjectUnits = [...units.values()]
          .filter((u) => u.parentId === s.id)
          .sort(byPositionThenKey)
          .map((u): UnitNode => {
            const unitChapters = [...chapters.values()]
              .filter((c) => c.parentId === u.id)
              .sort(byPositionThenKey)
              .map((c): ChapterNode => {
                const chapterTopics = [...topics.values()]
                  .filter((t) => t.parentId === c.id)
                  .sort(byPositionThenKey)
                  .map((t): TopicNode => ({
                    id: t.id,
                    key: t.key,
                    name: t.name,
                    position: t.position,
                    weights: wById.get(t.id) ?? [],
                  }));
                return {
                  id: c.id,
                  key: c.key,
                  name: c.name,
                  position: c.position,
                  topics: chapterTopics,
                  weights: wById.get(c.id) ?? [],
                };
              });
            return {
              id: u.id,
              key: u.key,
              name: u.name,
              position: u.position,
              chapters: unitChapters,
              weights: wById.get(u.id) ?? [],
            };
          });
        return {
          id: s.id,
          key: s.key,
          name: s.name,
          code: s.code,
          position: s.position,
          units: subjectUnits,
          weights: wById.get(s.id) ?? [],
        };
      });
  };

  return {
    async createVersion(input: NewCurriculumVersion) {
      const id = randomUUID();
      versions.set(id, { ...input, id, publishedAt: null });
      return { id };
    },
    async publishVersion(versionId: string) {
      const v = versions.get(versionId);
      if (!v) throw new Error(`curriculum version ${versionId} not found`);
      v.publishedAt = new Date().toISOString();
    },
    async addSubject(input: NewSubject) {
      const id = randomUUID();
      subjects.set(id, {
        id,
        versionId: input.curriculumVersionId,
        key: input.key,
        name: input.name,
        code: input.code ?? null,
        position: input.position,
      });
      return { id };
    },
    async addUnit(input: NewUnit) {
      const parent = subjects.get(input.subjectId);
      if (!parent) throw new Error(`subject ${input.subjectId} not found`);
      const id = randomUUID();
      units.set(id, {
        id,
        versionId: parent.versionId,
        parentId: input.subjectId,
        key: input.key,
        name: input.name,
        position: input.position,
      });
      return { id };
    },
    async addChapter(input: NewChapter) {
      const parent = units.get(input.unitId);
      if (!parent) throw new Error(`unit ${input.unitId} not found`);
      const id = randomUUID();
      chapters.set(id, {
        id,
        versionId: parent.versionId,
        parentId: input.unitId,
        key: input.key,
        name: input.name,
        position: input.position,
      });
      return { id };
    },
    async addTopic(input: NewTopic) {
      const parent = chapters.get(input.chapterId);
      if (!parent) throw new Error(`chapter ${input.chapterId} not found`);
      const id = randomUUID();
      topics.set(id, {
        id,
        versionId: parent.versionId,
        parentId: input.chapterId,
        key: input.key,
        name: input.name,
        position: input.position,
      });
      return { id };
    },
    async addWeight(input: NewAcademicWeight) {
      assertWeightProvenance(input);
      const { versionId, scopeId } = versionIdForScope(input.scope);
      const id = randomUUID();
      weights.push({
        id,
        versionId,
        scopeId,
        scopeType: input.scope.type,
        value: input.value,
        unit: input.unit,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference ?? null,
        confidence: input.confidence ?? null,
        effectiveFrom: input.effectiveFrom,
      });
      return { id };
    },
    async listVersions() {
      return [...versions.values()]
        .sort(
          (a, b) =>
            a.board.localeCompare(b.board) ||
            a.grade - b.grade ||
            a.academicYearLabel.localeCompare(b.academicYearLabel) ||
            a.version.localeCompare(b.version),
        )
        .map(toView);
    },
    async getVersion(versionId: string) {
      const v = versions.get(versionId);
      return v ? toView(v) : null;
    },
    async getHierarchy(versionId: string) {
      return buildHierarchy(versionId);
    },
    async getSubjectHierarchy(subjectId: string) {
      const s = subjects.get(subjectId);
      if (!s) return null;
      return buildHierarchy(s.versionId).find((n) => n.id === subjectId) ?? null;
    },
  };
}
