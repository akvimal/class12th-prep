/**
 * Background jobs — plan reconciliation, daily-plan persistence and domain
 * notification-event generation. These run from a worker entrypoint
 * (`scripts/run-daily-jobs.ts`), never the web request path.
 */
export { runDailyJobs, type DailyJobResult } from './daily';
export { generateDailyEvents } from './generate-events';
