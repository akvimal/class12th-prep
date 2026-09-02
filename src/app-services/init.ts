import { z } from 'zod';
import type { Repositories } from '@/persistence/ports';
import { cbseClass12Curriculum } from '@/persistence/seed/cbse-curriculum';
import { importCurriculum } from './curriculum-import';
import { getActiveProfile, type ActiveProfile } from './profile';
import { recalculateAcademicYearReadiness } from './readiness';

type InitRepos = Pick<
  Repositories,
  'planning' | 'curriculum' | 'progress' | 'session' | 'readiness'
>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const profileConfigSchema = z.object({
  family: z.object({ name: z.string().min(1) }),
  student: z.object({
    displayName: z.string().min(1),
    board: z.string().min(1).default('CBSE'),
    grade: z.number().int().min(1).max(12).default(12),
    timezone: z.string().min(1).default('Asia/Kolkata'),
  }),
  academicYear: z.object({
    yearLabel: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
  }),
  plan: z.object({
    startDate: isoDate,
    syllabusTargetDate: isoDate,
    hardCompletionDate: isoDate,
    revisionStartDate: isoDate,
    examWindowStart: isoDate,
    examWindowEnd: isoDate,
    weekdayCapacityMinutes: z.number().int().min(0),
    weekendCapacityMinutes: z.number().int().min(0),
  }),
  subjects: z
    .array(
      z.object({
        key: z.string().min(1),
        theoryMaxMarks: z.number().int().min(0).optional(),
        practicalMaxMarks: z.number().int().min(0).optional(),
        targetMarks: z.number().int().min(0).optional(),
      }),
    )
    .min(1),
});

export type ProfileConfig = z.infer<typeof profileConfigSchema>;

export interface InitResult {
  created: boolean;
  profile: ActiveProfile;
}

/**
 * Create the single real student profile from a config object: import the
 * derived CBSE Class XII curriculum, create the family / student / academic
 * year, enrol the subjects, create and activate the plan, and compute an
 * initial readiness snapshot. Idempotent — if a student already exists it
 * returns the existing active profile untouched.
 */
export async function initRealProfile(
  repos: InitRepos,
  config: ProfileConfig,
): Promise<InitResult> {
  const existing = await getActiveProfile(repos);
  if (existing) return { created: false, profile: existing };

  const { versionId } = await importCurriculum(repos.curriculum, cbseClass12Curriculum);

  const family = await repos.planning.createFamily(config.family);
  const student = await repos.planning.createStudent({
    familyId: family.id,
    displayName: config.student.displayName,
    board: config.student.board,
    grade: config.student.grade,
    timezone: config.student.timezone,
  });
  const year = await repos.planning.createAcademicYear({
    studentId: student.id,
    curriculumVersionId: versionId,
    yearLabel: config.academicYear.yearLabel,
    startDate: config.academicYear.startDate,
    endDate: config.academicYear.endDate,
  });

  const hierarchy = await repos.curriculum.getHierarchy(versionId);
  const subjectIdByKey = new Map(hierarchy.map((s) => [s.key, s.id]));
  for (const subject of config.subjects) {
    const subjectId = subjectIdByKey.get(subject.key);
    if (!subjectId) {
      throw new Error(`init: subject "${subject.key}" is not in the CBSE Class XII curriculum`);
    }
    await repos.planning.enrollSubject({
      academicYearId: year.id,
      subjectId,
      theoryMaxMarks: subject.theoryMaxMarks ?? null,
      practicalMaxMarks: subject.practicalMaxMarks ?? null,
      targetMarks: subject.targetMarks ?? null,
    });
  }

  const plan = await repos.planning.createPlan({ academicYearId: year.id, ...config.plan });
  await repos.planning.activatePlan(plan.id);

  await recalculateAcademicYearReadiness(repos, year.id, { asOf: config.plan.startDate });

  const profile = await getActiveProfile(repos);
  if (!profile) throw new Error('init: profile not resolvable after creation');
  return { created: true, profile };
}
