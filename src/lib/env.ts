/**
 * Central environment access. Nothing else in the app reads `process.env`
 * directly, so configuration surface stays visible in one place.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isCI: process.env.CI === 'true' || process.env.CI === '1',
} as const;
