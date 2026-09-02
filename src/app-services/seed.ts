import { syntheticSeedSpec, type SeedSpec } from '@/persistence/seed/spec';
import type { Repositories } from '@/persistence/ports';
import { importCurriculum } from './curriculum-import';

type SeedRepos = Pick<Repositories, 'planning' | 'curriculum' | 'schoolCalendar'>;

export interface SeedResult {
  /** false when the seed data was already present (idempotent no-op). */
  created: boolean;
  curriculumVersionId: string;
  familyId?: string;
  studentId?: string;
  academicYearId?: string;
  planId?: string;
  counts?: { subjects: number; chapters: number; enrollments: number; calendarEvents: number };
}

/**
 * Loads the synthetic validation seed (docs/TEST_STRATEGY.md golden fixture).
 * Idempotent: if a curriculum version with the seed's identity already exists,
 * nothing is written and `created: false` is returned. For a clean slate use
 * `pnpm db:reset` first.
 */
export async function seedSynthetic(
  repos: SeedRepos,
  spec: SeedSpec = syntheticSeedSpec,
): Promise<SeedResult> {
  const { version } = spec.curriculum;
  const existing = (await repos.curriculum.listVersions()).find(
    (v) =>
      v.board === version.board &&
      v.grade === version.grade &&
      v.academicYearLabel === version.academicYearLabel &&
      v.version === version.version,
  );
  if (existing) return { created: false, curriculumVersionId: existing.id };

  const curriculum = await importCurriculum(repos.curriculum, spec.curriculum);
  const versionId = curriculum.versionId;

  const family = await repos.planning.createFamily(spec.family);
  const student = await repos.planning.createStudent({ familyId: family.id, ...spec.student });
  const academicYear = await repos.planning.createAcademicYear({
    studentId: student.id,
    curriculumVersionId: versionId,
    ...spec.academicYear,
  });

  const subjectIdByKey = new Map(
    (await repos.curriculum.getHierarchy(versionId)).map((s) => [s.key, s.id]),
  );

  let enrollments = 0;
  for (const e of spec.enrollments) {
    const subjectId = subjectIdByKey.get(e.subjectKey);
    if (!subjectId) throw new Error(`seed: subject key "${e.subjectKey}" not found in curriculum`);
    await repos.planning.enrollSubject({
      academicYearId: academicYear.id,
      subjectId,
      theoryMaxMarks: e.theoryMaxMarks ?? null,
      practicalMaxMarks: e.practicalMaxMarks ?? null,
      targetMarks: e.targetMarks ?? null,
      boardExamDate: e.boardExamDate ?? null,
      ...(e.enabled === undefined ? {} : { enabled: e.enabled }),
    });
    enrollments += 1;
  }

  const plan = await repos.planning.createPlan({
    academicYearId: academicYear.id,
    startDate: spec.plan.startDate,
    syllabusTargetDate: spec.plan.syllabusTargetDate,
    hardCompletionDate: spec.plan.hardCompletionDate,
    revisionStartDate: spec.plan.revisionStartDate,
    examWindowStart: spec.plan.examWindowStart,
    examWindowEnd: spec.plan.examWindowEnd,
    weekdayCapacityMinutes: spec.plan.weekdayCapacityMinutes,
    weekendCapacityMinutes: spec.plan.weekendCapacityMinutes,
  });
  if (spec.plan.activate) await repos.planning.activatePlan(plan.id);

  for (const event of spec.calendarEvents) {
    await repos.schoolCalendar.addEvent({
      academicYearId: academicYear.id,
      type: event.type,
      title: event.title ?? null,
      startDate: event.startDate,
      endDate: event.endDate,
      capacityOverride: event.capacityOverride ?? null,
      notes: event.notes ?? null,
    });
  }

  return {
    created: true,
    curriculumVersionId: versionId,
    familyId: family.id,
    studentId: student.id,
    academicYearId: academicYear.id,
    planId: plan.id,
    counts: {
      subjects: curriculum.counts.subjects,
      chapters: curriculum.counts.chapters,
      enrollments,
      calendarEvents: spec.calendarEvents.length,
    },
  };
}
