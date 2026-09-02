import { InfoIcon, PlayIcon } from '@/components/icons';
import { Chip, PageHeader, PrimaryButton, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const MICRO = [
  ['0–10', 'Recall field & potential formulae from memory, then check'],
  ['10–38', '8 board‑style problems on Gauss’s law & dipoles'],
  ['38–45', 'Mark errors by type & log the outcome'],
];

export default function StudyNowPage() {
  return (
    <main>
      <PageHeader back="/today" title="Study Now" />
      <p className="px-5 text-[13px] leading-relaxed text-muted">
        One task, chosen for the time you have.
      </p>

      <SectionLabel className="px-5 pb-2 pt-6">How long do you have?</SectionLabel>
      <div className="flex gap-2 px-5">
        {[20, 30, 45, 60, 90].map((m) => (
          <span
            key={m}
            className={`flex-1 rounded-lg py-2.5 text-center text-[13px] font-semibold ${
              m === 45
                ? 'border-[1.5px] border-ink bg-ink text-paper'
                : 'border border-line text-muted'
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <p className="px-5 pt-1.5 text-[11px] text-faint">minutes</p>

      <SectionLabel className="px-5 pb-2 pt-6">Recommended</SectionLabel>
      <div className="mx-5 flex flex-col gap-3 rounded-2xl border-[1.5px] border-ink p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
            Physics · Practise
          </span>
          <span className="font-mono text-[11px] text-muted">45 min</span>
        </div>
        <div className="font-display text-[21px] font-bold leading-tight text-ink">
          Electrostatics
        </div>

        <div className="flex flex-col gap-2">
          {MICRO.map(([time, text]) => (
            <div key={time} className="flex gap-2.5">
              <span className="w-[42px] shrink-0 font-mono text-[11px] text-faint">{time}</span>
              <span className="text-[12px] leading-snug text-muted">{text}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-line-soft pt-2.5">
          <SectionLabel>Why this?</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="accent">School test soonest</Chip>
            <Chip>Below‑target readiness</Chip>
            <Chip>High board weight</Chip>
            <Chip>Fits 45 min</Chip>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Physics has a unit test in 5 days and Electrostatics is your weakest tested chapter in
            that set. Practice is the highest‑value activity at this readiness level.
          </p>
        </div>

        <PrimaryButton href="/session">
          <PlayIcon size={15} /> Start this task
        </PrimaryButton>
        <a href="/study-now" className="text-center text-[12px] font-semibold text-muted">
          Show a different task
        </a>
      </div>

      <p className="flex items-start gap-2 px-5 pt-4 text-[11px] leading-relaxed text-faint">
        <InfoIcon size={13} className="mt-0.5 shrink-0" />
        The same plan, time and progress always produce the same recommendation. No hidden ranking.
      </p>
      <div className="h-6" />
    </main>
  );
}
