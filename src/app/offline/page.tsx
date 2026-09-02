export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
        Board Prep
      </div>
      <h1 className="mt-2 font-display text-[22px] font-bold text-ink">You&apos;re offline</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        This tracker needs a connection to load your latest readiness and plan. It&apos;ll pick up
        where you left off once you&apos;re back online.
      </p>
    </main>
  );
}
