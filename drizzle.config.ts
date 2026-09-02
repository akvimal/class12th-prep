import { defineConfig } from 'drizzle-kit';

/**
 * Schema files land under src/persistence/schema/ from TASK-002 onward.
 * Generated SQL migrations are written to ./drizzle and committed.
 */
export default defineConfig({
  schema: './src/persistence/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://prep:prep@localhost:5432/prep',
  },
  strict: true,
  verbose: true,
});
