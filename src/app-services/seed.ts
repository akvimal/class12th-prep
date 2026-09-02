import type { ChapterState } from '@/domain/progress/chapter-progress';
import { ASSESSMENT_TYPES, type AssessmentType } from '@/domain/assessment/assessment';
import { firstRevision } from '@/domain/revision/revision';
import { revisionV1 } from '@/config/revision';
import { syntheticSeedSpec, type SeedSpec } from '@/persistence/seed/spec';
import type { Repositories } from '@/persistence/ports';
import { importCurriculum } from './curriculum-import';
import { recalculateAcademicYearReadiness } from './readiness';

type SeedRepos = Pick<
  Repositories,
  | 'planning'
  | 'curriculum'
  | 'schoolCalendar'
  | 'progress'
  | 'session'
  | 'readiness'
  | 'assessment'
  | 'studyWindow'
  | 'revision'
>;

/** Sensible starter study windows for a new profile. */
export const DEFAULT_STUDY_WINDOWS = [
  { dayType: 'WEEKDAY' as const, startTime: '17:00', endTime: '18:30', label: 'After school' },
  { dayType: 'WEEKDAY' as const, startTime: '20:30', endTime: '21:15', label: 'Recall block' },
  { dayType: 'WEEKEND' as const, startTime: '09:30', endTime: '13:00', label: 'Deep work' },
];

export interface SeedResult {
  /** false when the seed data was already present (idempotent no-op). */
  created: boolean;
  curriculumVersionId: string;
  familyId?: string;
  studentId?: string;
  academicYearId?: string;
  planId?: string;
  counts?: {
    subjects: number;
    chapters: number;
    enrollments: number;
    calendarEvents: number;
    chapterProgress: number;
    studySessions: number;
    assessments: number;
    readinessSnapshots: number;
  };
}

/** Rough placeholder state until the readiness engine (TASK-009) recomputes it. */
function seedState(readiness: number): ChapterState {
  if (readiness <= 0) return 'NOT_STARTED';
  if (readiness >= 85) return 'REVISED';
  if (readiness >= 65) return 'TESTED';
  if (readiness >= 45) return 'PRACTISED';
  if (readiness >= 25) return 'LEARNED';
  return 'LEARNING';
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

  const hierarchy = await repos.curriculum.getHierarchy(versionId);
  const subjectIdByKey = new Map(hierarchy.map((s) => [s.key, s.id]));
  const chapterIdByKey = new Map(
    hierarchy.flatMap((s) => s.units.flatMap((u) => u.chapters.map((c) => [c.key, c.id] as const))),
  );
  const chapterCtxByKey = new Map(
    hierarchy.flatMap((s) =>
      s.units.flatMap((u) =>
        u.chapters.map((c) => [c.key, { chapterId: c.id, subjectId: s.id }] as const),
      ),
    ),
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

  let chapterProgressCount = 0;
  for (const cp of spec.chapterProgress) {
    const chapterId = chapterIdByKey.get(cp.chapterKey);
    if (!chapterId) throw new Error(`seed: chapter key "${cp.chapterKey}" not found in curriculum`);
    const state = seedState(cp.readiness);
    await repos.progress.setChapterProgress(academicYear.id, chapterId, {
      schoolStatus: cp.schoolStatus,
      state,
      conceptScore: cp.readiness,
      practiceScore: cp.readiness,
      testScore: cp.readiness,
      recallScore: cp.readiness,
      revisionScore: cp.readiness,
    });
    chapterProgressCount += 1;

    // Chapters past LEARNED get a first spaced revision, dated off the plan start.
    if (['LEARNED', 'PRACTISED', 'TESTED', 'REVISED'].includes(state)) {
      const first = firstRevision(spec.plan.startDate, revisionV1);
      await repos.revision.schedule({
        academicYearId: academicYear.id,
        chapterId,
        revisionNumber: first.revisionNumber,
        dueDate: first.dueDate,
        method: first.method,
        algorithmVersion: revisionV1.version,
      });
    }
  }

  let studySessionCount = 0;
  for (const s of spec.studySessions) {
    const ctx = s.chapterKey ? chapterCtxByKey.get(s.chapterKey) : undefined;
    const subjectId =
      ctx?.subjectId ?? (s.subjectKey ? (subjectIdByKey.get(s.subjectKey) ?? null) : null);
    await repos.session.recordSession({
      academicYearId: academicYear.id,
      chapterId: ctx?.chapterId ?? null,
      subjectId,
      type: s.type,
      completion: s.completion,
      sessionDate: s.sessionDate,
      plannedMinutes: s.plannedMinutes ?? null,
      actualMinutes: s.actualMinutes,
      attempted: s.attempted ?? null,
      correct: s.correct ?? null,
      confidenceAfter: s.confidenceAfter ?? null,
    });
    studySessionCount += 1;
  }

  let assessmentCount = 0;
  for (const a of spec.assessments) {
    const subjectId = subjectIdByKey.get(a.subjectKey);
    if (!subjectId) throw new Error(`seed: assessment subject "${a.subjectKey}" not found`);
    const chapterIds = a.chapterKeys.map((key) => {
      const id = chapterIdByKey.get(key);
      if (!id) throw new Error(`seed: assessment chapter "${key}" not found`);
      return id;
    });
    const type = (ASSESSMENT_TYPES as readonly string[]).includes(a.type)
      ? (a.type as AssessmentType)
      : 'SCHOOL_UNIT_TEST';
    await repos.assessment.createAssessment({
      academicYearId: academicYear.id,
      subjectId,
      type,
      name: a.name,
      examDate: a.date,
      maxMarks: a.maxMarks,
      chapterIds,
    });
    assessmentCount += 1;
  }

  for (const w of DEFAULT_STUDY_WINDOWS) {
    await repos.studyWindow.createWindow({ academicYearId: academicYear.id, ...w });
  }

  // Compute readiness as of the plan start so the seed is deterministic.
  const readinessSummary = await recalculateAcademicYearReadiness(repos, academicYear.id, {
    asOf: spec.plan.startDate,
  });

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
      chapterProgress: chapterProgressCount,
      studySessions: studySessionCount,
      assessments: assessmentCount,
      readinessSnapshots: readinessSummary?.chaptersProcessed ?? 0,
    },
  };
}
