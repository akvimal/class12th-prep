import { createInMemoryRepositories } from '@/persistence/in-memory';
import type { Repositories } from '@/persistence/ports';
import { seedSynthetic } from './seed';

export interface DemoContext {
  repos: Repositories;
  familyId: string;
  studentId: string;
  academicYearId: string;
  planId: string;
  curriculumVersionId: string;
}

/** The shell renders "as of" a fixed date so the synthetic data is stable. */
export const DEMO_DATE = '2026-09-02';

let cache: Promise<DemoContext> | null = null;

/**
 * The single, in-memory, synthetic-seed-backed context the UI shell renders
 * from. No database, no auth yet — this is replaced by real student selection
 * when Phase 6 (accounts) lands.
 */
export function demo(): Promise<DemoContext> {
  cache ??= (async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);
    return {
      repos,
      familyId: seed.familyId!,
      studentId: seed.studentId!,
      academicYearId: seed.academicYearId!,
      planId: seed.planId!,
      curriculumVersionId: seed.curriculumVersionId,
    };
  })();
  return cache;
}
