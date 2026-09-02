import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('./passcode');
}

const ORIG = { ...process.env };

beforeEach(() => {
  delete process.env.PREP_PASSCODE;
  delete process.env.PREP_PASSCODE_HASH;
  delete process.env.PREP_PARENT_PASSCODE;
  delete process.env.PREP_PARENT_PASSCODE_HASH;
  delete process.env.PREP_SESSION_SECRET;
});
afterEach(() => {
  process.env = { ...ORIG };
});

describe('passcode lock', () => {
  it('is disabled when nothing is configured', async () => {
    const { isLockEnabled, hasParentPasscode, readSession } = await load();
    expect(isLockEnabled()).toBe(false);
    expect(hasParentPasscode()).toBe(false);
    expect(await readSession('anything')).toBeNull();
  });

  it('resolves the student role and round-trips a session token', async () => {
    process.env.PREP_PASSCODE = 'super-secret-42';
    const { isLockEnabled, resolveRole, issueSessionToken, readSession } = await load();

    expect(isLockEnabled()).toBe(true);
    expect(await resolveRole('super-secret-42')).toBe('student');
    expect(await resolveRole('wrong')).toBeNull();
    expect(await resolveRole('')).toBeNull();

    const token = await issueSessionToken('student');
    expect(await readSession(token)).toEqual({ role: 'student' });
    expect(await readSession(token.slice(0, -1) + 'x')).toBeNull();
    expect(await readSession('student.123.abc')).toBeNull();
  });

  it('resolves a separate parent role when a parent passcode is set', async () => {
    process.env.PREP_PASSCODE = 'student-code';
    process.env.PREP_PARENT_PASSCODE = 'parent-code';
    const { hasParentPasscode, resolveRole, issueSessionToken, readSession } = await load();

    expect(hasParentPasscode()).toBe(true);
    expect(await resolveRole('student-code')).toBe('student');
    expect(await resolveRole('parent-code')).toBe('parent');

    const parentToken = await issueSessionToken('parent');
    expect(await readSession(parentToken)).toEqual({ role: 'parent' });
  });

  it('accepts a pre-hashed passcode', async () => {
    // sha256("1234")
    process.env.PREP_PASSCODE_HASH =
      '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
    const { resolveRole } = await load();
    expect(await resolveRole('1234')).toBe('student');
    expect(await resolveRole('12345')).toBeNull();
  });

  it('rejects a token signed under a different passcode secret', async () => {
    process.env.PREP_PASSCODE = 'first';
    const a = await load();
    const token = await a.issueSessionToken('student');

    process.env.PREP_PASSCODE = 'second';
    const b = await load();
    expect(await b.readSession(token)).toBeNull();
  });

  it('safeNext blocks open redirects', async () => {
    const { safeNext } = await load();
    expect(safeNext('/today')).toBe('/today');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
