import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIG = { ...process.env };
beforeEach(() => {
  vi.resetModules();
  delete process.env.PREP_PASSCODE;
  delete process.env.PREP_PARENT_PASSCODE;
  delete process.env.PREP_SESSION_SECRET;
});
afterEach(() => {
  process.env = { ...ORIG };
});

function request(path: string, cookie?: string): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return new NextRequest(`http://localhost${path}`, { headers });
}

async function load() {
  const passcode = await import('@/lib/passcode');
  const { middleware } = await import('./middleware');
  return { passcode, middleware };
}

describe('middleware passcode gate', () => {
  it('passes everything through when no passcode is configured', async () => {
    const { middleware } = await load();
    const res = await middleware(request('/today'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects an unauthenticated request to /unlock with a next param', async () => {
    process.env.PREP_PASSCODE = 'stud';
    const { middleware } = await load();
    const res = await middleware(request('/subjects/PHY'));
    expect(res.headers.get('location')).toBe('http://localhost/unlock?next=%2Fsubjects%2FPHY');
  });

  it('lets a valid student session reach any page', async () => {
    process.env.PREP_PASSCODE = 'stud';
    const { passcode, middleware } = await load();
    const token = await passcode.issueSessionToken('student');
    const res = await middleware(request('/today', `prep_session=${token}`));
    expect(res.headers.get('location')).toBeNull();
  });

  it('confines a parent session to /parent', async () => {
    process.env.PREP_PASSCODE = 'stud';
    process.env.PREP_PARENT_PASSCODE = 'par';
    const { passcode, middleware } = await load();
    const token = await passcode.issueSessionToken('parent');

    const blocked = await middleware(request('/today', `prep_session=${token}`));
    expect(blocked.headers.get('location')).toBe('http://localhost/parent');

    const allowed = await middleware(request('/parent', `prep_session=${token}`));
    expect(allowed.headers.get('location')).toBeNull();
  });

  it('a forged / stale token is treated as unauthenticated', async () => {
    process.env.PREP_PASSCODE = 'stud';
    const { middleware } = await load();
    const res = await middleware(request('/today', 'prep_session=parent.999.forged'));
    expect(res.headers.get('location')).toContain('/unlock');
  });
});
