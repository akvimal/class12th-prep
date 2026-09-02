/**
 * Passcode gate for the single-family MVP — no accounts, no user table.
 *
 * One or two passcodes:
 *   PREP_PASSCODE         → a `student` session (full access)
 *   PREP_PARENT_PASSCODE  → a `parent` session (parent summary only)
 *
 * Enabled only when a student passcode is configured, so `pnpm dev` and CI are
 * unaffected. Uses Web Crypto so the same helpers run in middleware (edge) and
 * server actions (node).
 */

import { env } from './env';

const COOKIE_NAME = 'prep_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type Role = 'student' | 'parent';

const te = new TextEncoder();

/** The gate is on only when a student passcode (hash or plaintext) is set. */
export function isLockEnabled(): boolean {
  return env.passcodeHash !== '' || env.passcode !== '';
}

export function hasParentPasscode(): boolean {
  return env.parentPasscodeHash !== '' || env.parentPasscode !== '';
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', te.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashFor(role: Role): Promise<string> {
  if (role === 'parent') {
    return env.parentPasscodeHash || (env.parentPasscode ? sha256Hex(env.parentPasscode) : '');
  }
  return env.passcodeHash || sha256Hex(env.passcode);
}

async function sessionSecret(): Promise<string> {
  if (env.sessionSecret) return env.sessionSecret;
  // Derived from the student passcode so a token can't be forged without it.
  return `derived:${await hashFor('student')}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    te.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return b64url(await crypto.subtle.sign('HMAC', key, te.encode(data)));
}

/** Which role a passcode unlocks, or null if it matches neither. */
export async function resolveRole(input: string): Promise<Role | null> {
  if (!input) return null;
  const supplied = await sha256Hex(input);
  if (timingSafeEqual(supplied, await hashFor('student'))) return 'student';
  const parentHash = await hashFor('parent');
  if (parentHash && timingSafeEqual(supplied, parentHash)) return 'parent';
  return null;
}

export async function issueSessionToken(role: Role): Promise<string> {
  const payload = `${role}.${Date.now()}`;
  return `${payload}.${await hmac(await sessionSecret(), payload)}`;
}

/** Verify a session cookie and return its role, or null. */
export async function readSession(token: string | undefined): Promise<{ role: Role } | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [role, ts, sig] = parts as [string, string, string];
  if (role !== 'student' && role !== 'parent') return null;

  const issuedAt = Number(ts);
  if (!Number.isFinite(issuedAt)) return null;
  if ((Date.now() - issuedAt) / 1000 > MAX_AGE_SECONDS) return null;

  const expected = await hmac(await sessionSecret(), `${role}.${ts}`);
  return timingSafeEqual(sig, expected) ? { role } : null;
}

/** Only allow same-origin absolute paths as a post-unlock redirect target. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

/** Paths a `parent` session may reach (everything else redirects to /parent). */
export const PARENT_ALLOWED = new Set(['/parent']);

export const passcodeCookie = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
