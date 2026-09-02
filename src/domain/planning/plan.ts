/**
 * Plan vocabulary shared by the domain, persistence and (later) the UI.
 * Values match docs/DOMAIN_MODEL.md and the database enums verbatim.
 */

export const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PHASE_TYPES = [
  'FOUNDATION',
  'SYLLABUS_COVERAGE',
  'CONSOLIDATION',
  'REVISION',
  'PREBOARD',
  'BOARD_EXAM',
] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];
