import type { PgDatabase } from 'drizzle-orm/pg-core';
import type * as schema from '@/persistence/schema';

/**
 * The narrowest Drizzle type the repositories need. Both the node-postgres
 * driver (production) and PGlite (tests) satisfy it, so repository code is
 * written once and exercised against a real Postgres engine in both places.
 * The query-result HKT is left open (`any`) because it differs per driver.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DrizzleDb = PgDatabase<any, typeof schema>;
