import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { domainEvents, families } from '@/persistence/schema';
import { createTestDatabase, truncateAll } from '@/persistence/testing/test-db';
import { seedTestDatabase } from '@/persistence/testing/seeded-db';
import type { DrizzleDb } from './db';
import { createDrizzleEventRepository } from './event-repository';
import { createDrizzlePlanningRepository } from './planning-repository';

let db: DrizzleDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDatabase());
});
afterAll(() => close());
beforeEach(async () => {
  await truncateAll(db);
  await seedTestDatabase(db);
});

async function studentId() {
  const planning = createDrizzlePlanningRepository(db);
  const [student] = await planning.listStudents();
  return student!.id;
}

const draft = (sid: string, over: Partial<Parameters<ReturnType<typeof createDrizzleEventRepository>['append']>[0]> = {}) => ({
  studentId: sid,
  eventType: 'SCHOOL_TEST_APPROACHING' as const,
  aggregateType: 'assessment',
  aggregateId: 'a1',
  payload: { daysUntil: 3 },
  dedupeKey: 'SCHOOL_TEST_APPROACHING:assessment:a1:2026-09-02',
  ...over,
});

describe('drizzle event repository', () => {
  it('appends an event and dedupes on (student, dedupeKey)', async () => {
    const repo = createDrizzleEventRepository(db);
    const sid = await studentId();

    const first = await repo.append(draft(sid));
    expect(first.created).toBe(true);
    expect(first.record.deliveryStatus).toBe('PENDING');

    const second = await repo.append(draft(sid, { payload: { daysUntil: 2 } }));
    expect(second.created).toBe(false);
    expect(second.record.id).toBe(first.record.id);
    expect(second.record.payload.daysUntil).toBe(3); // original kept

    expect(await db.select().from(domainEvents)).toHaveLength(1);
  });

  it('lists newest-first and filters by type / delivery status', async () => {
    const repo = createDrizzleEventRepository(db);
    const sid = await studentId();
    const a = await repo.append(draft(sid, { dedupeKey: 'k1', aggregateId: 'a1' }));
    await repo.append(draft(sid, { eventType: 'REVISION_DUE', dedupeKey: 'k2', aggregateId: 'c1' }));
    await repo.setDeliveryStatus(a.record.id, 'DELIVERED');

    expect((await repo.list(sid)).map((e) => e.eventType).sort()).toEqual([
      'REVISION_DUE',
      'SCHOOL_TEST_APPROACHING',
    ]);
    expect(await repo.list(sid, { eventType: 'REVISION_DUE' })).toHaveLength(1);
    const pending = await repo.list(sid, { deliveryStatus: 'PENDING' });
    expect(pending).toHaveLength(1);
    expect(pending[0]!.eventType).toBe('REVISION_DUE');
  });

  it('cascades away when the family is deleted', async () => {
    const repo = createDrizzleEventRepository(db);
    await repo.append(draft(await studentId()));
    await db.delete(families);
    expect(await db.select().from(domainEvents)).toHaveLength(0);
  });
});
