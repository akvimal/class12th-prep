/**
 * Domain event vocabulary (docs/DOMAIN_MODEL.md `DomainEvent`, SRS §13).
 * Events are persisted as evidence and generated as each engine comes online;
 * a delivery channel is wired in Phase 7. Generation is idempotent via a
 * `dedupeKey` — one event per type + aggregate + day.
 */

export const DOMAIN_EVENT_TYPES = [
  'REVISION_DUE',
  'REVISION_OVERDUE',
  'SCHOOL_TEST_APPROACHING',
  'PREBOARD_APPROACHING',
  'STUDY_BLOCK_MISSED',
  'PLAN_AT_RISK',
  'WEEKLY_REVIEW_READY',
  'REPEATED_ERROR_DETECTED',
  'SYLLABUS_TARGET_AT_RISK',
] as const;
export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export const DELIVERY_STATUSES = ['PENDING', 'DELIVERED', 'SUPPRESSED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DomainEventDraft {
  studentId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload?: Record<string, unknown>;
  /** Extra qualifier folded into the dedupe key (e.g. the calendar date). */
  on?: string;
}

/** `type:aggregateType:aggregateId[:on]` — unique per student. */
export function dedupeKey(draft: DomainEventDraft): string {
  const base = `${draft.eventType}:${draft.aggregateType}:${draft.aggregateId}`;
  return draft.on ? `${base}:${draft.on}` : base;
}
