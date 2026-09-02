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
  /** Single-passcode gate. Set the plaintext passcode or its SHA-256 hex hash. */
  passcode: (process.env.PREP_PASSCODE ?? '').trim(),
  passcodeHash: (process.env.PREP_PASSCODE_HASH ?? '').trim().toLowerCase(),
  /** HMAC secret for the unlock cookie; derived from the passcode when unset. */
  sessionSecret: (process.env.PREP_SESSION_SECRET ?? '').trim(),
} as const;
