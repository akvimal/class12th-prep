import { redirect } from 'next/navigation';
import { isLockEnabled, safeNext } from '@/lib/passcode';
import { unlockAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  if (!isLockEnabled()) redirect(safeNext(sp.next));

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-[340px]">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
          Board Prep
        </div>
        <h1 className="mt-2 font-display text-[26px] font-bold leading-tight text-ink">
          Enter your passcode
        </h1>

        <form action={unlockAction} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={safeNext(sp.next)} />
          <input
            type="password"
            name="passcode"
            autoFocus
            autoComplete="current-password"
            inputMode="numeric"
            aria-label="Passcode"
            className="h-12 w-full rounded-xl border border-line bg-card px-4 text-center text-[18px] tracking-[0.3em] text-ink"
          />
          {sp.error && (
            <p className="text-[12px] font-medium text-bad">That passcode didn&apos;t match.</p>
          )}
          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
          >
            Unlock
          </button>
        </form>

        <p className="mt-6 text-[11px] leading-relaxed text-faint">
          One passcode for this device. It stays unlocked for 30 days.
        </p>
      </div>
    </main>
  );
}
