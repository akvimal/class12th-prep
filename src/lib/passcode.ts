/**
 * Single-passcode gate for the whole app (build-plan "Auth & RBAC" — one family
 * in the MVP). No accounts, no user table. Enabled only when a passcode is
 * configured, so `pnpm dev` and CI are unaffected.
 *
 * Uses Web Crypto so the same helpers run in middleware (edge) and in server
 * actions (node).
 */

import { env } from './env';

const COOKIE_NAME = 'prep_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const te = new TextEncoder();

/** The gate is on only when a passcode (hash or plaintext) is set. */
export function isLockEnabled(): boolean {
  return env.passcodeHash !== '' || env.passcode !== '';
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', te.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function configuredHash(): Promise<string> {
  if (env.passcodeHash) return env.passcodeHash;
  return sha256Hex(env.passcode);
}

async function sessionSecret(): Promise<string> {
  if (env.sessionSecret) return env.sessionSecret;
  // Fall back to a value derived from the passcode so a token can't be forged
  // without it. Changing the passcode invalidates existing sessions.
  return `derived:${await configuredHash()}`;
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

export async function verifyPasscode(input: string): Promise<boolean> {
  if (!input) return false;
  return timingSafeEqual(await sha256Hex(input), await configuredHash());
}

export async function issueSessionToken(): Promise<string> {
  const payload = String(Date.now());
  return `${payload}.${await hmac(await sessionSecret(), payload)}`;
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return false;
  if ((Date.now() - issuedAt) / 1000 > MAX_AGE_SECONDS) return false;

  return timingSafeEqual(sig, await hmac(await sessionSecret(), payload));
}

/** Only allow same-origin absolute paths as a post-unlock redirect target. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

export const passcodeCookie = { name: COOKIE_NAME, maxAge: MAX_AGE_SECONDS };
