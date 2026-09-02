import { sql } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/persistence/schema';
import type { DrizzleDb } from '@/persistence/drizzle/db';

/**
 * A fresh, isolated Postgres for one test file — PGlite (Postgres 16 compiled
 * to WASM) running in-process. It applies the committed migrations in
 * `drizzle/`, so every run also proves "migration works on an empty database".
 * No Docker, no shared state between test files.
 *
 * Create it once per file in `beforeAll`, then call `truncateAll` in
 * `beforeEach` — migrating once instead of once-per-test keeps the suite fast.
 */
export async function createTestDatabase(): Promise<{
  db: DrizzleDb;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: 'drizzle' });
  return {
    db: db as unknown as DrizzleDb,
    close: () => client.close(),
  };
}

/** Empty every table in the `public` schema (migration tracking lives elsewhere). */
export async function truncateAll(db: DrizzleDb): Promise<void> {
  const result = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const rows =
    (result as { rows?: { tablename: string }[] }).rows ?? (result as { tablename: string }[]);
  const tables = rows.map((r) => `"${r.tablename}"`);
  if (tables.length === 0) return;
  await db.execute(sql.raw(`truncate table ${tables.join(', ')} restart identity cascade`));
}
