import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/persistence/schema';
import { env } from './env';

/** Single shared connection pool. */
const pool = new Pool({
  connectionString: env.databaseUrl,
  // Keep the local footprint small; production tuning comes later.
  max: 10,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

/** Liveness probe used by the health endpoint. Never throws. */
export async function pingDatabase(): Promise<boolean> {
  if (!env.databaseUrl) return false;
  try {
    const client = await pool.connect();
    try {
      await client.query('select 1');
      return true;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}
