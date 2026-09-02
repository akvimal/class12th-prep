'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { issueSessionToken, passcodeCookie, safeNext, verifyPasscode } from '@/lib/passcode';

export async function unlockAction(formData: FormData): Promise<void> {
  const passcode = String(formData.get('passcode') ?? '');
  const next = safeNext(String(formData.get('next') ?? '/'));

  if (!(await verifyPasscode(passcode))) {
    redirect(`/unlock?next=${encodeURIComponent(next)}&error=1`);
  }

  const store = await cookies();
  store.set(passcodeCookie.name, await issueSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: passcodeCookie.maxAge,
  });

  redirect(next);
}
