/**
 * Central environment access. Nothing else in the app reads `process.env`
 * directly, so configuration surface stays visible in one place.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isCI: process.env.CI === 'true' || process.env.CI === '1',
  /**
   * Which data source the UI renders from: `memory` (throwaway synthetic seed,
   * zero setup) or `database` (the real student profile in Postgres). Unset =
   * `database` in production when a DATABASE_URL is present, `memory` otherwise.
   */
  appDataSource: (process.env.APP_DATA_SOURCE ?? '') as '' | 'memory' | 'database',
} as const;
