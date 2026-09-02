import { describe, expect, it } from 'vitest';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import { seedSynthetic } from './seed';
import { addAssessment } from './assessment';
import { recordAssessmentResult } from './assessment-results';
import { getBoardProjection } from './projection';

async function seeded() {
  const repos = createInMemoryRepositories();
  const seed = await seedSynthetic(repos);
  return { repos, academicYearId: seed.academicYearId! };
}

describe('getBoardProjection', () => {
  it('shows no projection for a subject with no graded test', async () => {
    const { repos, academicYearId } = await seeded();
    const p = await getBoardProjection(repos, academicYearId);
    expect(p!.subjects.every((s) => s.projectedPct === null)).toBe(true);
    expect(p!.subjects.every((s) => !s.sufficientEvidence)).toBe(true);
    expect(p!.overall.projectedPct).toBeNull();
    expect(p!.overall.subjectsWithProjection).toBe(0);
  });

  it('projects a subject once it has a graded pre-board across its syllabus', async () => {
    const { repos, academicYearId } = await seeded();
    const a = await addAssessment(repos, academicYearId, {
      type: 'PREBOARD',
      name: 'Physics pre-board',
      examDate: '2026-09-07',
      maxMarks: 70,
      subjectKey: 'PHY',
      chapterKeys: ['PHY01', 'PHY02', 'PHY03'],
    });
    await recordAssessmentResult(repos, academicYearId, a!.id, {
      score: 42, // 60%
      errors: [{ chapterKey: 'PHY03', errorType: 'CONCEPT', marksLost: 10 }],
    });

    const p = await getBoardProjection(repos, academicYearId);
    const phy = p!.subjects.find((s) => s.subjectKey === 'PHY')!;
    expect(phy.sufficientEvidence).toBe(true);
    expect(phy.projectedPct).not.toBeNull();
    expect(phy.assessmentsCounted).toBe(1);
    expect(phy.targetPct).toBe(80); // 80 / (70 + 30)
    expect(phy.marksOpportunity).toBeGreaterThan(0); // conservative projection below an 80 target
    expect(phy.projectedMarks).not.toBeNull();

    // other subjects still have no projection
    expect(p!.subjects.find((s) => s.subjectKey === 'MAT')!.projectedPct).toBeNull();

    // overall reflects the one qualifying subject
    expect(p!.overall.subjectsWithProjection).toBe(1);
    expect(p!.overall.projectedPct).toBe(phy.projectedPct);
  });

  it('is version-stamped', async () => {
    const { repos, academicYearId } = await seeded();
    expect((await getBoardProjection(repos, academicYearId))!.algorithmVersion).toBe(
      'projection-v1',
    );
  });
});
