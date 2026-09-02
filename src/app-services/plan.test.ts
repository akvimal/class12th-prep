import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import {
  createPreparationPlan,
  enrollSubjects,
  getPlanOverview,
  updatePreparationPlan,
} from './plan';

const shortPlan = {
  startDate: '2026-09-02',
  syllabusTargetDate: '2026-12-20',
  hardCompletionDate: '2026-12-31',
  revisionStartDate: '2027-01-01',
  examWindowStart: '2027-02-01',
  examWindowEnd: '2027-03-31',
  weekdayCapacityMinutes: 120,
  weekendCapacityMinutes: 240,
};

async function aYear(repos: ReturnType<typeof createInMemoryRepositories>) {
  const family = await repos.planning.createFamily({ name: 'F' });
  const student = await repos.planning.createStudent({
    familyId: family.id,
    displayName: 'S',
    board: 'CBSE',
    grade: 12,
  });
  return repos.planning.createAcademicYear({
    studentId: student.id,
    yearLabel: '2026-27',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  });
}

describe('preparation plan services', () => {
  it('creates a plan and returns its phases and current phase', async () => {
    const repos = createInMemoryRepositories();
    const year = await aYear(repos);

    const overview = await createPreparationPlan(repos, year.id, shortPlan);
    expect(overview.plan.status).toBe('DRAFT');
    expect(overview.phases.map((p) => p.phaseType)).toEqual([
      'SYLLABUS_COVERAGE',
      'CONSOLIDATION',
      'REVISION',
      'PREBOARD',
      'BOARD_EXAM',
    ]);

    const asOf = await getPlanOverview(repos, overview.plan.id, '2027-01-20');
    expect(asOf?.currentPhase).toBe('PREBOARD');
  });

  it('returns null overview for an unknown plan', async () => {
    const repos = createInMemoryRepositories();
    expect(await getPlanOverview(repos, 'nope')).toBeNull();
    expect(await updatePreparationPlan(repos, 'nope', { weekdayCapacityMinutes: 100 })).toBeNull();
  });

  it('updating the target date shifts the resolved phase without touching other config', async () => {
    const repos = createInMemoryRepositories();
    const year = await aYear(repos);
    const { plan } = await createPreparationPlan(repos, year.id, shortPlan);

    const updated = await updatePreparationPlan(repos, plan.id, {
      syllabusTargetDate: '2026-11-15',
    });
    expect(updated?.plan.weekdayCapacityMinutes).toBe(120);
    expect(updated?.plan.examWindowEnd).toBe('2027-03-31');

    const inDec = await getPlanOverview(repos, plan.id, '2026-12-01');
    expect(inDec?.currentPhase).toBe('CONSOLIDATION');
  });

  it('enrols multiple subjects and lists them', async () => {
    const repos = createInMemoryRepositories();
    const year = await aYear(repos);
    const enrollments = await enrollSubjects(repos, year.id, [
      { subjectId: 's1', targetMarks: 80 },
      { subjectId: 's2', targetMarks: 75, boardExamDate: '2027-03-05' },
    ]);
    expect(enrollments).toHaveLength(2);
  });
});
