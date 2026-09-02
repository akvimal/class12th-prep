import { jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { students } from './students';
import { domainEventDelivery, domainEventType } from './enums';

/**
 * Persisted domain event (docs/DOMAIN_MODEL.md `DomainEvent`, SRS §13).
 * Generated as each engine comes online; delivered only in Phase 7. The
 * `dedupe_key` makes generation idempotent (one event per type + aggregate +
 * day).
 */
export const domainEvents = pgTable(
  'domain_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    eventType: domainEventType('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').notNull().default({}),
    dedupeKey: text('dedupe_key').notNull(),
    deliveryStatus: domainEventDelivery('delivery_status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('domain_events_dedupe').on(t.studentId, t.dedupeKey)],
);

export type DomainEventRow = typeof domainEvents.$inferSelect;
