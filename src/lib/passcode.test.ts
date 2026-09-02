import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('./passcode');
}

const ORIG = { ...process.env };

beforeEach(() => {
  delete process.env.PREP_PASSCODE;
  delete process.env.PREP_PASSCODE_HASH;
  delete process.env.PREP_SESSION_SECRET;
});
afterEach(() => {
  process.env = { ...ORIG };
});

describe('passcode lock', () => {
  it('is disabled when nothing is configured', async () => {
    const { isLockEnabled, isValidSessionToken } = await load();
    expect(isLockEnabled()).toBe(false);
    expect(await isValidSessionToken('anything')).toBe(false);
  });

  it('verifies a plaintext passcode and round-trips a session token', async () => {
    process.env.PREP_PASSCODE = 'super-secret-42';
    const { isLockEnabled, verifyPasscode, issueSessionToken, isValidSessionToken } = await load();

    expect(isLockEnabled()).toBe(true);
    expect(await verifyPasscode('super-secret-42')).toBe(true);
    expect(await verifyPasscode('wrong')).toBe(false);
    expect(await verifyPasscode('')).toBe(false);

    const token = await issueSessionToken();
    expect(await isValidSessionToken(token)).toBe(true);
    expect(await isValidSessionToken(token.slice(0, -1) + 'x')).toBe(false);
    expect(await isValidSessionToken('123.abc')).toBe(false);
  });

  it('accepts a pre-hashed passcode', async () => {
    // sha256("1234")
    process.env.PREP_PASSCODE_HASH =
      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
    const { verifyPasscode } = await load();
    expect(await verifyPasscode('1234')).toBe(true);
    expect(await verifyPasscode('12345')).toBe(false);
  });

  it('rejects a token signed with a different secret (changed passcode)', async () => {
    process.env.PREP_PASSCODE = 'first';
    const a = await load();
    const token = await a.issueSessionToken();

    process.env.PREP_PASSCODE = 'second';
    const b = await load();
    expect(await b.isValidSessionToken(token)).toBe(false);
  });

  it('safeNext blocks open redirects', async () => {
    const { safeNext } = await load();
    expect(safeNext('/today')).toBe('/today');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
