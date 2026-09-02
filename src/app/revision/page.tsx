import { SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const OVERDUE = [
  { name: 'Solutions', subject: 'Chemistry', detail: 'R2 · active recall · due 3 days ago' },
];
const DUE = [
  {
    name: 'Current Electricity',
    subject: 'Physics',
    detail: 'R3 · retry 5 past errors + 3 questions',
  },
  { name: 'SQL', subject: 'Computer Science', detail: 'R2 · write 4 queries from prompts' },
];
const UPCOMING = [
  ['Matrices', 'Maths', 'in 2 days'],
  ['Electrochemistry', 'Chem', 'in 4 days'],
  ['Python Revision', 'CS', 'in 6 days'],
];

function Item({ name, subject, detail }: { name: string; subject: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-3.5">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink">
          {name} <span className="font-normal text-faint">· {subject}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted">{detail}</div>
      </div>
      <span className="ml-3 h-9 shrink-0 rounded-lg bg-ink px-4 text-[12px] font-semibold leading-9 text-paper">
        Start
      </span>
    </div>
  );
}

export default function RevisionPage() {
  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Revision</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Spaced retrieval — short, active, testing‑style.
        </p>
      </header>

      <div className="mx-5 flex flex-col gap-1.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
        <div className="text-[13px] font-semibold text-ink">
          1 item slipped — recover in 3 short sessions
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          We’ll space Solutions across today, Thu and Sat rather than pile it on now. No growing
          backlog.
        </p>
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">Overdue · 1</SectionLabel>
      <div className="px-5">
        {OVERDUE.map((r) => (
          <Item key={r.name} {...r} />
        ))}
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">Due today · 2</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {DUE.map((r) => (
          <Item key={r.name} {...r} />
        ))}
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">Upcoming</SectionLabel>
      <div className="px-5">
        {UPCOMING.map(([name, subject, when]) => (
          <div
            key={name}
            className="flex justify-between border-b border-line-soft py-3 last:border-0"
          >
            <span className="text-[13px] font-medium text-ink">
              {name} <span className="text-faint">· {subject}</span>
            </span>
            <span className="font-mono text-[11px] text-faint">{when}</span>
          </div>
        ))}
      </div>

      <div className="mx-5 mt-5 flex items-center justify-between rounded-xl border border-line px-3.5 py-3">
        <span className="text-[12px] font-semibold text-muted">Mastered</span>
        <span className="font-mono text-[12px] text-faint">4 chapters ›</span>
      </div>
      <div className="h-6" />
    </main>
  );
}
