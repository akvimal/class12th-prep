import { createDrizzleRepositories } from '@/persistence/drizzle';
import { runDailyJobs } from '@/jobs';

/**
 * Worker entrypoint for the once-a-day background pass. Run from cron on the
 * VPS (e.g. `5 3 * * *  cd /app && pnpm jobs:daily`) or as a one-shot compose
 * service. Idempotent, so a missed run just catches up the next day.
 *
 * An optional ISO date argument overrides "today" (backfill / testing):
 *   pnpm jobs:daily 2026-09-02
 */
async function main() {
  const asOf = process.argv[2];
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new Error(`expected an ISO date (YYYY-MM-DD), got "${asOf}"`);
  }

  const result = await runDailyJobs(createDrizzleRepositories(), asOf);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ran) console.warn('No active profile — nothing to do. Run `pnpm prep:init` first.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
