import { asc, eq } from 'drizzle-orm';
import { assertWeightProvenance } from '@/domain/curriculum/provenance';
import type {
  CurriculumVersionView,
  ChapterNode,
  SubjectNode,
  TopicNode,
  UnitNode,
  WeightView,
} from '@/domain/curriculum/hierarchy';
import {
  academicWeights,
  chapters,
  curriculumVersions,
  subjects,
  topics,
  units,
} from '@/persistence/schema';
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
import type { DrizzleDb } from './db';

function toVersionView(row: typeof curriculumVersions.$inferSelect): CurriculumVersionView {
  return {
    id: row.id,
    board: row.board,
    grade: row.grade,
    academicYearLabel: row.academicYearLabel,
    version: row.version,
    sourceReference: row.sourceReference,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

export function createDrizzleCurriculumRepository(db: DrizzleDb): CurriculumRepository {
  async function versionIdForScope(scope: WeightScope): Promise<string> {
    if (scope.type === 'SUBJECT') {
      const [r] = await db
        .select({ v: subjects.curriculumVersionId })
        .from(subjects)
        .where(eq(subjects.id, scope.subjectId));
      if (!r) throw new Error(`subject ${scope.subjectId} not found`);
      return r.v;
    }
    if (scope.type === 'UNIT') {
      const [r] = await db
        .select({ v: units.curriculumVersionId })
        .from(units)
        .where(eq(units.id, scope.unitId));
      if (!r) throw new Error(`unit ${scope.unitId} not found`);
      return r.v;
    }
    if (scope.type === 'CHAPTER') {
      const [r] = await db
        .select({ v: chapters.curriculumVersionId })
        .from(chapters)
        .where(eq(chapters.id, scope.chapterId));
      if (!r) throw new Error(`chapter ${scope.chapterId} not found`);
      return r.v;
    }
    const [r] = await db
      .select({ v: topics.curriculumVersionId })
      .from(topics)
      .where(eq(topics.id, scope.topicId));
    if (!r) throw new Error(`topic ${scope.topicId} not found`);
    return r.v;
  }

  return {
    async createVersion(input: NewCurriculumVersion) {
      const [row] = await db
        .insert(curriculumVersions)
        .values({
          board: input.board,
          grade: input.grade,
          academicYearLabel: input.academicYearLabel,
          version: input.version,
          sourceReference: input.sourceReference ?? null,
        })
        .returning({ id: curriculumVersions.id });
      return { id: row!.id };
    },

    async publishVersion(versionId: string) {
      const updated = await db
        .update(curriculumVersions)
        .set({ publishedAt: new Date() })
        .where(eq(curriculumVersions.id, versionId))
        .returning({ id: curriculumVersions.id });
      if (updated.length === 0) throw new Error(`curriculum version ${versionId} not found`);
    },

    async addSubject(input: NewSubject) {
      const [row] = await db
        .insert(subjects)
        .values({
          curriculumVersionId: input.curriculumVersionId,
          key: input.key,
          name: input.name,
          code: input.code ?? null,
          position: input.position,
        })
        .returning({ id: subjects.id });
      return { id: row!.id };
    },

    async addUnit(input: NewUnit) {
      const [parent] = await db
        .select({ v: subjects.curriculumVersionId })
        .from(subjects)
        .where(eq(subjects.id, input.subjectId));
      if (!parent) throw new Error(`subject ${input.subjectId} not found`);
      const [row] = await db
        .insert(units)
        .values({
          curriculumVersionId: parent.v,
          subjectId: input.subjectId,
          key: input.key,
          name: input.name,
          position: input.position,
        })
        .returning({ id: units.id });
      return { id: row!.id };
    },

    async addChapter(input: NewChapter) {
      const [parent] = await db
        .select({ v: units.curriculumVersionId })
        .from(units)
        .where(eq(units.id, input.unitId));
      if (!parent) throw new Error(`unit ${input.unitId} not found`);
      const [row] = await db
        .insert(chapters)
        .values({
          curriculumVersionId: parent.v,
          unitId: input.unitId,
          key: input.key,
          name: input.name,
          position: input.position,
        })
        .returning({ id: chapters.id });
      return { id: row!.id };
    },

    async addTopic(input: NewTopic) {
      const [parent] = await db
        .select({ v: chapters.curriculumVersionId })
        .from(chapters)
        .where(eq(chapters.id, input.chapterId));
      if (!parent) throw new Error(`chapter ${input.chapterId} not found`);
      const [row] = await db
        .insert(topics)
        .values({
          curriculumVersionId: parent.v,
          chapterId: input.chapterId,
          key: input.key,
          name: input.name,
          position: input.position,
        })
        .returning({ id: topics.id });
      return { id: row!.id };
    },

    async addWeight(input: NewAcademicWeight) {
      assertWeightProvenance(input);
      const curriculumVersionId = await versionIdForScope(input.scope);
      const [row] = await db
        .insert(academicWeights)
        .values({
          curriculumVersionId,
          scopeType: input.scope.type,
          subjectId: input.scope.type === 'SUBJECT' ? input.scope.subjectId : null,
          unitId: input.scope.type === 'UNIT' ? input.scope.unitId : null,
          chapterId: input.scope.type === 'CHAPTER' ? input.scope.chapterId : null,
          topicId: input.scope.type === 'TOPIC' ? input.scope.topicId : null,
          value: input.value,
          unit: input.unit,
          sourceType: input.sourceType,
          sourceReference: input.sourceReference ?? null,
          confidence: input.confidence ?? null,
          effectiveFrom: input.effectiveFrom,
          retrievedAt: input.retrievedAt ? new Date(input.retrievedAt) : null,
          parserVersion: input.parserVersion ?? null,
        })
        .returning({ id: academicWeights.id });
      return { id: row!.id };
    },

    async listVersions() {
      const rows = await db
        .select()
        .from(curriculumVersions)
        .orderBy(
          asc(curriculumVersions.board),
          asc(curriculumVersions.grade),
          asc(curriculumVersions.academicYearLabel),
          asc(curriculumVersions.version),
        );
      return rows.map(toVersionView);
    },

    async getVersion(versionId: string) {
      const [row] = await db
        .select()
        .from(curriculumVersions)
        .where(eq(curriculumVersions.id, versionId));
      return row ? toVersionView(row) : null;
    },

    async getHierarchy(versionId: string) {
      return buildHierarchy(db, versionId);
    },

    async getSubjectHierarchy(subjectId: string) {
      const [subject] = await db
        .select({ v: subjects.curriculumVersionId })
        .from(subjects)
        .where(eq(subjects.id, subjectId));
      if (!subject) return null;
      const tree = await buildHierarchy(db, subject.v);
      return tree.find((s) => s.id === subjectId) ?? null;
    },
  };
}

function weightView(row: typeof academicWeights.$inferSelect): WeightView {
  return {
    id: row.id,
    scopeType: row.scopeType,
    value: row.value,
    unit: row.unit,
    sourceType: row.sourceType,
    sourceReference: row.sourceReference,
    confidence: row.confidence,
    effectiveFrom: row.effectiveFrom,
  };
}

const byPositionThenKey = <T extends { position: number; key: string }>(a: T, b: T) =>
  a.position - b.position || a.key.localeCompare(b.key);

async function buildHierarchy(db: DrizzleDb, versionId: string): Promise<SubjectNode[]> {
  const [subjectRows, unitRows, chapterRows, topicRows, weightRows] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.curriculumVersionId, versionId)),
    db.select().from(units).where(eq(units.curriculumVersionId, versionId)),
    db.select().from(chapters).where(eq(chapters.curriculumVersionId, versionId)),
    db.select().from(topics).where(eq(topics.curriculumVersionId, versionId)),
    db.select().from(academicWeights).where(eq(academicWeights.curriculumVersionId, versionId)),
  ]);

  const weightsBy = {
    SUBJECT: new Map<string, WeightView[]>(),
    UNIT: new Map<string, WeightView[]>(),
    CHAPTER: new Map<string, WeightView[]>(),
    TOPIC: new Map<string, WeightView[]>(),
  };
  for (const w of weightRows) {
    const scopeId = w.subjectId ?? w.unitId ?? w.chapterId ?? w.topicId;
    if (!scopeId) continue;
    pushToMap(weightsBy[w.scopeType], scopeId, weightView(w));
  }

  const topicsByChapter = groupBy(topicRows, (t) => t.chapterId);
  const chaptersByUnit = groupBy(chapterRows, (c) => c.unitId);
  const unitsBySubject = groupBy(unitRows, (u) => u.subjectId);

  return subjectRows.sort(byPositionThenKey).map((s): SubjectNode => {
    const subjectUnits = (unitsBySubject.get(s.id) ?? []).sort(byPositionThenKey).map((u): UnitNode => {
      const unitChapters = (chaptersByUnit.get(u.id) ?? [])
        .sort(byPositionThenKey)
        .map((c): ChapterNode => {
          const chapterTopics = (topicsByChapter.get(c.id) ?? [])
            .sort(byPositionThenKey)
            .map(
              (t): TopicNode => ({
                id: t.id,
                key: t.key,
                name: t.name,
                position: t.position,
                weights: weightsBy.TOPIC.get(t.id) ?? [],
              }),
            );
          return {
            id: c.id,
            key: c.key,
            name: c.name,
            position: c.position,
            topics: chapterTopics,
            weights: weightsBy.CHAPTER.get(c.id) ?? [],
          };
        });
      return {
        id: u.id,
        key: u.key,
        name: u.name,
        position: u.position,
        chapters: unitChapters,
        weights: weightsBy.UNIT.get(u.id) ?? [],
      };
    });
    return {
      id: s.id,
      key: s.key,
      name: s.name,
      code: s.code,
      position: s.position,
      units: subjectUnits,
      weights: weightsBy.SUBJECT.get(s.id) ?? [],
    };
  });
}

function pushToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) pushToMap(out, key(row), row);
  return out;
}
