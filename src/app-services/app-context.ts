import { redirect } from 'next/navigation';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import type { Repositories } from '@/persistence/ports';
import { env } from '@/lib/env';
import { repositories } from './context';
import { getActiveProfile } from './profile';
import { seedSynthetic } from './seed';

export interface AppContext {
  repos: Repositories;
  studentName: string;
  academicYearId: string;
  planId: string;
  curriculumVersionId: string | null;
  /** The date every screen renders "as of": real today with a database, a
   *  fixed date for the throwaway in-memory demo. */
  asOf: string;
  /** true when this is the in-memory synthetic seed (no DATABASE_URL). */
  isDemo: boolean;
}

/** Raised when a database is configured but no student profile exists yet. */
export class ProfileNotReadyError extends Error {
  constructor() {
    super('no active student profile — run `pnpm prep:init`');
    this.name = 'ProfileNotReadyError';
  }
}

/** The date the in-memory demo renders as, so its synthetic data stays stable. */
export const DEMO_DATE = '2026-09-02';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

let demoCache: Promise<AppContext> | null = null;

function demoContext(): Promise<AppContext> {
  demoCache ??= (async () => {
    const repos = createInMemoryRepositories();
    const seed = await seedSynthetic(repos);
    return {
      repos,
      studentName: 'Demo Student',
      academicYearId: seed.academicYearId!,
      planId: seed.planId!,
      curriculumVersionId: seed.curriculumVersionId,
      asOf: DEMO_DATE,
      isDemo: true,
    };
  })();
  return demoCache;
}

/** Whether the UI should read the real Postgres profile rather than the demo. */
export function usesDatabase(): boolean {
  if (env.appDataSource === 'database') return true;
  if (env.appDataSource === 'memory') return false;
  return env.nodeEnv === 'production' && Boolean(env.databaseUrl);
}

/**
 * The context every screen renders from. In `database` mode it resolves the
 * real student profile (Postgres); otherwise it uses the in-memory synthetic
 * seed so `pnpm dev` needs no setup. See {@link usesDatabase}.
 *
 * Throws `ProfileNotReadyError` when the database is selected but empty — call
 * {@link uiContext} from a page to turn that into a redirect to `/welcome`.
 */
export async function appContext(): Promise<AppContext> {
  if (!usesDatabase()) return demoContext();
  if (!env.databaseUrl) throw new ProfileNotReadyError();

  const repos = repositories();
  const profile = await getActiveProfile(repos);
  if (!profile) throw new ProfileNotReadyError();

  return {
    repos,
    studentName: profile.studentName,
    academicYearId: profile.academicYearId,
    planId: profile.planId,
    curriculumVersionId: profile.curriculumVersionId,
    asOf: todayIso(),
    isDemo: false,
  };
}

/** {@link appContext} for use inside a page/route — redirects to `/welcome`
 *  instead of throwing when the profile is not set up yet. */
export async function uiContext(): Promise<AppContext> {
  try {
    return await appContext();
  } catch (err) {
    if (err instanceof ProfileNotReadyError) redirect('/welcome');
    throw err;
  }
}
