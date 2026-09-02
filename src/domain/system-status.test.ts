import { describe, expect, it } from 'vitest';
import { systemStatus } from './system-status';

describe('systemStatus', () => {
  it('is ok when every check passes', () => {
    expect(systemStatus({ database: true })).toBe('ok');
  });

  it('is degraded when any check fails', () => {
    expect(systemStatus({ database: false, cache: true })).toBe('degraded');
  });

  it('treats an empty set of checks as ok', () => {
    expect(systemStatus({})).toBe('ok');
  });
});
