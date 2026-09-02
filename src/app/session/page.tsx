import Link from 'next/link';
import { PrimaryButton, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function SessionPage() {
  return (
    <main>
      <div className="bg-ink px-5 pb-4 pt-5 text-paper">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-white/60">
          Physics · Practise
        </div>
        <div className="mt-1.5 font-display text-[20px] font-bold leading-tight">
          Electrostatics
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[26px]">42:07</span>
          <span className="text-[11px] text-white/60">elapsed · 45 planned</span>
          <span className="ml-auto rounded-lg border border-white/25 px-3 py-1.5 text-[12px] font-semibold">
            Pause
          </span>
        </div>
      </div>

      <h2 className="px-5 pb-1 pt-5 font-display text-[17px] font-bold text-ink">How did it go?</h2>
      <div className="flex gap-2 px-5 pt-2">
        {['Complete', 'Partial', 'Skip'].map((c) => (
          <span
            key={c}
            className={`flex-1 rounded-lg py-3 text-center text-[13px] font-semibold ${
              c === 'Complete'
                ? 'border-[1.5px] border-ink bg-ink text-paper'
                : 'border border-line text-muted'
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between px-5 pt-5">
        <span className="text-[13px] font-semibold text-ink">Time spent</span>
        <span className="flex items-center gap-3.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-[16px] text-muted">
            −
          </span>
          <span className="min-w-[52px] text-center font-mono text-[16px]">42 m</span>
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-line text-[16px] text-muted">
            +
          </span>
        </span>
      </div>

      <SectionLabel className="px-5 pb-2 pt-4">
        Questions <span className="text-line">(optional)</span>
      </SectionLabel>
      <div className="flex gap-3 px-5">
        {[
          ['Attempted', 8],
          ['Correct', 5],
        ].map(([label, n]) => (
          <div
            key={label}
            className="flex flex-1 items-center justify-between rounded-lg border border-line px-3 py-2.5"
          >
            <span className="text-[12px] font-medium text-muted">{label}</span>
            <span className="font-mono text-[15px]">{n}</span>
          </div>
        ))}
      </div>

      <div className="px-5 pt-5">
        <div className="text-[13px] font-semibold text-ink">Confidence now</div>
        <div className="mt-2.5 flex gap-2">
          {['Weak', 'Moderate', 'Strong'].map((c) => (
            <span
              key={c}
              className={`flex-1 rounded-lg py-2.5 text-center text-[12px] font-semibold ${
                c === 'Moderate'
                  ? 'border-[1.5px] border-ink text-ink'
                  : 'border border-line text-muted'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
          Confidence guides planning, but your test result carries more weight in readiness.
        </p>
      </div>

      <div className="px-5 pt-5">
        <div className="text-[13px] font-semibold text-ink">
          Where did marks go? <span className="font-normal text-faint">3 marked</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-sink px-2.5 py-2 text-[11px] font-semibold text-ink">
            Calculation · 2
          </span>
          <span className="rounded-lg bg-sink px-2.5 py-2 text-[11px] font-semibold text-ink">
            Concept · 1
          </span>
          {['Formula recall', 'Misread', 'Time'].map((t) => (
            <span
              key={t}
              className="rounded-lg border border-dashed border-line px-2.5 py-2 text-[11px] font-semibold text-faint"
            >
              + {t}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6">
        <PrimaryButton href="/today">Save &amp; continue</PrimaryButton>
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Saved as evidence. A partial session updates your scores but never marks a chapter
          finished on its own.{' '}
          <Link href="/today" className="text-accent">
            Back to Today
          </Link>
        </p>
      </div>
      <div className="h-6" />
    </main>
  );
}
