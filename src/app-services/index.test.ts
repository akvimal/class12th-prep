import { describe, expect, it } from 'vitest';
import { getHealth } from './index';
import { createInMemoryRepositories } from '@/persistence/in-memory';

describe('getHealth', () => {
  it('reports ok when the store is reachable', async () => {
    const result = await getHealth(createInMemoryRepositories());
    expect(result).toEqual({ status: 'ok', checks: { database: true } });
  });

  it('reports degraded when the store is unreachable', async () => {
    const result = await getHealth({ health: { isReachable: async () => false } });
    expect(result.status).toBe('degraded');
    expect(result.checks.database).toBe(false);
  });
});
