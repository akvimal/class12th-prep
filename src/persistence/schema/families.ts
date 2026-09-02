import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_shared';

/**
 * Family / tenant boundary. The MVP has one family, but ownership is modelled
 * from the start so multi-family support needs no rewrite (docs/ARCHITECTURE.md
 * "Multi-tenancy").
 */
export const families = pgTable('families', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...timestamps,
});

export type Family = typeof families.$inferSelect;
export type NewFamilyRow = typeof families.$inferInsert;
