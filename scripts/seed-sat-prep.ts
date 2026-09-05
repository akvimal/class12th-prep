import { getActiveProfile } from '@/app-services/profile';
import { listSatAttempts, recordSatAttempt, startSatPrepPlan } from '@/app-services/sat-prep';
import { createDrizzleRepositories } from '@/persistence/drizzle';
import type { NewSatDomainScore } from '@/persistence/ports';

/**
 * One-off load of the two real SAT score reports into the SAT prep tables,
 * plus starting the 3rd-attempt prep plan. Idempotent: skips attempts already
 * recorded and a plan if one is already active.
 */

const attempt1Domains: NewSatDomainScore[] = [
  { domain: 'INFORMATION_AND_IDEAS', performanceLow: 550, performanceHigh: 600 },
  { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 490, performanceHigh: 540 },
  { domain: 'EXPRESSION_OF_IDEAS', performanceLow: 610, performanceHigh: 670 },
  { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
  { domain: 'ALGEBRA', performanceLow: 610, performanceHigh: 670 },
  { domain: 'ADVANCED_MATH', performanceLow: 680, performanceHigh: 800 },
  { domain: 'PROBLEM_SOLVING_DATA_ANALYSIS', performanceLow: 680, performanceHigh: 800 },
  { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 680, performanceHigh: 800 },
];

const attempt2Domains: NewSatDomainScore[] = [
  { domain: 'INFORMATION_AND_IDEAS', performanceLow: 610, performanceHigh: 670 },
  { domain: 'CRAFT_AND_STRUCTURE', performanceLow: 610, performanceHigh: 670 },
  { domain: 'EXPRESSION_OF_IDEAS', performanceLow: 680, performanceHigh: 800 },
  { domain: 'STANDARD_ENGLISH_CONVENTIONS', performanceLow: 610, performanceHigh: 670 },
  { domain: 'ALGEBRA', performanceLow: 680, performanceHigh: 800 },
  { domain: 'ADVANCED_MATH', performanceLow: 680, performanceHigh: 800 },
  { domain: 'PROBLEM_SOLVING_DATA_ANALYSIS', performanceLow: 680, performanceHigh: 800 },
  { domain: 'GEOMETRY_TRIGONOMETRY', performanceLow: 610, performanceHigh: 670 },
];

const TEST_DATE = '2026-11-07';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const repos = createDrizzleRepositories();
  const profile = await getActiveProfile(repos);
  if (!profile) throw new Error('no active student profile — run `pnpm prep:init` first');

  const existing = await listSatAttempts(repos, profile.studentId);
  if (existing.length === 0) {
    await recordSatAttempt(repos, {
      studentId: profile.studentId,
      attemptNumber: 1,
      testDate: '2026-03-01',
      totalScore: 1300,
      readingWritingScore: 610,
      mathScore: 690,
      domainScores: attempt1Domains,
    });
    await recordSatAttempt(repos, {
      studentId: profile.studentId,
      attemptNumber: 2,
      testDate: '2026-06-01',
      totalScore: 1390,
      readingWritingScore: 640,
      mathScore: 750,
      domainScores: attempt2Domains,
    });
    console.log('Recorded attempts 1 and 2.');
  } else {
    console.log(`${existing.length} attempt(s) already recorded — skipping.`);
  }

  const activePlan = await repos.satPrep.getActivePlan(profile.studentId);
  if (!activePlan) {
    const plan = await startSatPrepPlan(repos, profile.studentId, {
      testDate: TEST_DATE,
      startDate: today(),
    });
    console.log('Started SAT prep plan:', plan.id, `(${plan.startDate} → ${plan.testDate})`);
  } else {
    console.log('An active SAT prep plan already exists — nothing changed.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
