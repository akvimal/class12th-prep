import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/persistence/schema';
import type { DrizzleDb } from '@/persistence/drizzle/db';

/**
 * A fresh, isolated Postgres for one test file — PGlite (Postgres 16 compiled
 * to WASM) running in-process. It applies the committed migrations in
 * `drizzle/`, so every test also proves "migration works on an empty database".
 * No Docker, no shared state between test files.
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
