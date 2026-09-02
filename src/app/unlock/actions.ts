'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { issueSessionToken, passcodeCookie, resolveRole, safeNext } from '@/lib/passcode';

export async function unlockAction(formData: FormData): Promise<void> {
  const passcode = String(formData.get('passcode') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/'));

  const role = await resolveRole(passcode);
  if (!role) {
    redirect(`/unlock?next=${encodeURIComponent(next)}&error=1`);
  }

  // `Secure` cookies are dropped over plain HTTP (e.g. a VPS reached by IP), so
  // only set it when the request actually arrived over HTTPS.
  const proto = (await headers()).get('x-forwarded-proto');
  const store = await cookies();
  store.set(passcodeCookie.name, await issueSessionToken(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: proto === 'https',
    path: '/',
    maxAge: passcodeCookie.maxAge,
  });

  redirect(role === 'parent' ? '/parent' : next);
}
