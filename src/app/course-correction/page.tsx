import { DEMO_DATE, demo } from '@/app-services/demo';
import { getStudentOverview } from '@/app-services/overview';
import { PageHeader, Card, Chip, SectionLabel } from '@/components/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PROPOSALS = [
  {
    title: 'Reprioritise the queue',
    cost: 'No extra time',
    detail:
      'Push Ray Optics and Integrals to the top for 10 days; defer two already-strong chapters (Matrices, Python) to the consolidation phase.',
    effect: '+6 projected · target date unchanged',
    tone: 'ok' as const,
  },
  {
    title: 'Add 30 min on weekdays',
    cost: '+2h 30m / week',
    detail:
      'Extend the after-school window to 18:00–19:00 Mon–Fri until the syllabus target. Weekend load stays the same.',
    effect: '+11 projected · clears target ~5 days early',
    tone: 'warn' as const,
  },
  {
    title: 'Move the syllabus target',
    cost: 'Later finish',
    detail:
      'Shift the syllabus target from 20 Dec to 27 Dec. Revision phase shortens by one week; pre-board buffer holds.',
    effect: '+8 projected · revision window −7 days',
    tone: 'bad' as const,
  },
];

export default async function CourseCorrectionPage() {
  const { repos, academicYearId, planId } = await demo();
  const overview = await getStudentOverview(repos, academicYearId, planId, DEMO_DATE);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const now = overview.overallReadiness;

  return (
    <main>
      <PageHeader eyebrow="Course correction" title="Three ways back on track" back="/more" />

      <div className="px-5">
        <Card className="flex items-stretch gap-3">
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-faint">
              If nothing changes
            </div>
            <div className="mt-1 font-display text-[24px] font-bold text-ink">{now}</div>
            <div className="text-[11px] text-muted">→ ~71 projected</div>
          </div>
          <div className="w-px bg-line" />
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-wide text-faint">Target</div>
            <div className="mt-1 font-display text-[24px] font-bold text-ok">78</div>
            <div className="text-[11px] text-muted">by {formatDate(overview.examWindowStart)}</div>
          </div>
        </Card>
      </div>

      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Triggered because 2 study windows slipped this week and the projection dropped below
          target. Pick one — the plan re-resolves immediately and you can undo within 7 days.
        </p>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Proposals</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {PROPOSALS.map((p, i) => (
          <Card key={p.title} lead={i === 0} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-[16px] font-bold text-ink">{p.title}</span>
              <Chip tone={p.tone}>{p.cost}</Chip>
            </div>
            <p className="text-[12px] leading-relaxed text-muted">{p.detail}</p>
            <div className="font-mono text-[11px] font-semibold text-ink">{p.effect}</div>
            <button
              type="button"
              className={`mt-1 flex h-10 w-full items-center justify-center rounded-xl text-[13px] font-semibold ${
                i === 0 ? 'bg-accent text-accent-ink' : 'border border-line text-ink'
              }`}
            >
              {i === 0 ? 'Apply this' : 'Choose'}
            </button>
          </Card>
        ))}
      </div>

      <p className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Each proposal is a concrete diff to the plan — queue order, capacity, or dates — not advice.
        Nothing changes until you choose.
      </p>
      <div className="h-6" />
    </main>
  );
}
