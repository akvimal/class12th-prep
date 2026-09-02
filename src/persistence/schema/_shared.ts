import { timestamp } from 'drizzle-orm/pg-core';

/**
 * Every table carries these. Timestamps are stored in UTC (`timestamptz`)
 * per docs/ARCHITECTURE.md.
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
