import type { PlannerActivity, PlannerCandidate } from '@/domain/planning/daily-planner';
import { revisionDueState } from '@/domain/revision/revision';
import type { Repositories } from '@/persistence/ports';
import { getCurriculumProgress } from './progress';
import { getAcademicYearReadiness } from './readiness';
import { nextSchoolTestDaysByChapter } from './assessment';

type CandidateRepos = Pick<
  Repositories,
  'progress' | 'planning' | 'curriculum' | 'readiness' | 'assessment' | 'revision' | 'studyTask'
>;

/** Chapters at/after this state are considered "done enough" to skip in the queue. */
const DONE_STATES = new Set(['EXAM_READY']);

function pickActivity(state: string, schoolStatus: string, readiness: number): PlannerActivity {
  if (state === 'NOT_STARTED' || state === 'LEARNING' || schoolStatus === 'NOT_TAUGHT') {
    return 'LEARN';
  }
  if (readiness < 60) return 'PRACTISE';
  return 'ACTIVE_RECALL';
}

/**
 * Build the planner's candidate set for a day: one task per in-play chapter,
 * with its priority inputs assembled from progress, readiness snapshots and
 * upcoming school tests. A NOT_TAUGHT chapter with no imminent test is marked
 * `prerequisitesMet: false` so the planner leaves it alone.
 */
export async function buildDailyCandidates(
  repos: CandidateRepos,
  academicYearId: string,
  asOf: string,
): Promise<PlannerCandidate[]> {
  const progress = await getCurriculumProgress(repos, academicYearId);
  if (!progress) return [];

  const [snapshots, testDays, revisions, missedByChapter] = await Promise.all([
    getAcademicYearReadiness(repos, academicYearId),
    nextSchoolTestDaysByChapter(repos, academicYearId, asOf),
    repos.revision.listSchedules(academicYearId, { status: 'SCHEDULED' }),
    repos.studyTask.missedCountByChapter(academicYearId),
  ]);
  const readinessById = new Map((snapshots ?? []).map((s) => [s.scopeId, s.readiness]));
  const revisionDueById = new Map(revisions.map((r) => [r.chapterId, r.dueDate]));

  const candidates: PlannerCandidate[] = [];
  for (const subject of progress.subjects) {
    for (const unit of subject.units) {
      for (const chapter of unit.chapters) {
        const p = chapter.progress;
        if (DONE_STATES.has(p.state)) continue;

        const readiness = Math.round(readinessById.get(chapter.id) ?? p.effectiveReadiness ?? 0);
        const testIn = testDays.get(chapter.id) ?? null;
        const notTaught = p.schoolStatus === 'NOT_TAUGHT';

        candidates.push({
          id: chapter.key,
          subjectKey: subject.key,
          subjectName: subject.name,
          chapterKey: chapter.key,
          chapterName: chapter.name,
          activity: pickActivity(p.state, p.schoolStatus, readiness),
          estimatedMinutes: 0,
          // Leave untaught chapters alone unless a test is within two weeks.
          prerequisitesMet: !notTaught || (testIn != null && testIn <= 14),
          priority: {
            effectiveReadiness: readiness,
            boardWeight: chapter.weights[0]?.value ?? null,
            daysUntilSchoolTest: testIn,
            revisionDue: revisionDueById.has(chapter.id)
              ? revisionDueState(revisionDueById.get(chapter.id)!, asOf)
              : 'NONE',
            missedCount: missedByChapter[chapter.id] ?? 0,
          },
        });
      }
    }
  }
  return candidates;
}
