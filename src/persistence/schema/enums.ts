import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enum values match the domain vocabulary in docs/DOMAIN_MODEL.md and
 * docs/SRS.md verbatim, so there is no mapping layer between the database
 * and `src/domain`.
 */

export const planStatus = pgEnum('plan_status', ['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const phaseType = pgEnum('phase_type', [
  'FOUNDATION',
  'SYLLABUS_COVERAGE',
  'CONSOLIDATION',
  'REVISION',
  'PREBOARD',
  'BOARD_EXAM',
]);
