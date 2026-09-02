import { createDrizzleRepositories } from '@/persistence/drizzle';
import { createInMemoryRepositories } from '@/persistence/in-memory';
import type { Repositories } from '@/persistence/ports';
import { env } from '@/lib/env';

/**
 * Composition root. The rest of the app asks for `repositories()` and never
 * constructs a repository implementation itself.
 *
 * With no DATABASE_URL configured we fall back to the in-memory set so the
 * shell still runs; a real deployment always has one.
 */
export function repositories(): Repositories {
  return env.databaseUrl ? createDrizzleRepositories() : createInMemoryRepositories();
}
