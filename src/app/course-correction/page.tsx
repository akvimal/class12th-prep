import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getCourseCorrections } from '@/app-services/course-correction';
import { applyCourseCorrectionAction } from '@/app/actions';
import { PageHeader, Card, Chip, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const TONE: Record<string, 'ok' | 'warn' | 'bad'> = {
  REPRIORITISE: 'ok',
  ADD_CAPACITY: 'warn',
  MOVE_TARGET: 'bad',
};

export default async function CourseCorrectionPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const confirmCapacity = (await searchParams).confirm === 'capacity';
  const view = await getCourseCorrections(repos, academicYearId, planId, asOf);

  if (!view) return <p className="p-5 text-sm text-muted">No plan.</p>;

  if (view.corrections.length === 0) {
    return (
      <main>
        <PageHeader eyebrow="Course correction" title="Nothing to correct" back="/trajectory" />
        <p className="px-5 text-[13px] leading-relaxed text-muted">
          Plan pressure is <span className="font-semibold">{view.pressureBand}</span> — the plan
          fits the time left. Corrections appear here when demand runs ahead of capacity.
        </p>
      </main>
    );
  }

  return (
    <main>
      <PageHeader eyebrow="Course correction" title="Ways back on track" back="/trajectory" />

      <div className="mx-5 mt-1 flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Plan pressure is <span className="font-semibold text-ink">{view.pressureBand}</span>
          {view.deficitMinutes > 0
            ? ` · about ${Math.round(view.deficitMinutes / 60)}h of work over capacity`
            : ''}
          {view.projectionGap != null && view.projectionGap > 0
            ? ` · projection ${view.projectionGap} points under target`
            : ''}
          . Pick one — the plan re-resolves immediately. Nothing changes until you choose.
        </p>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Proposals</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {view.corrections.map((c, i) => {
          const needsConfirm =
            c.requiresConfirmation && !(confirmCapacity && c.kind === 'ADD_CAPACITY');
          return (
            <Card key={c.kind} lead={i === 0} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-[16px] font-bold text-ink">{c.title}</span>
                <Chip tone={TONE[c.kind]}>{c.tradeoff}</Chip>
              </div>
              <p className="text-[12px] leading-relaxed text-muted">{c.detail}</p>
              <div className="font-mono text-[11px] font-semibold text-ink">
                {c.projectedEffect}
              </div>

              {needsConfirm ? (
                <Link
                  href="/course-correction?confirm=capacity"
                  className="mt-1 flex h-10 w-full items-center justify-center rounded-xl border border-line text-[13px] font-semibold text-ink"
                >
                  Review this change
                </Link>
              ) : (
                <form action={applyCourseCorrectionAction} className="mt-1">
                  <input type="hidden" name="kind" value={c.kind} />
                  {c.params.weekdayMinutesDelta != null && (
                    <input
                      type="hidden"
                      name="weekdayMinutesDelta"
                      value={c.params.weekdayMinutesDelta}
                    />
                  )}
                  {c.params.targetShiftDays != null && (
                    <input type="hidden" name="targetShiftDays" value={c.params.targetShiftDays} />
                  )}
                  {c.kind === 'ADD_CAPACITY' && (
                    <input type="hidden" name="confirmed" value="yes" />
                  )}
                  <button
                    type="submit"
                    className={`flex h-10 w-full items-center justify-center rounded-xl text-[13px] font-semibold ${
                      i === 0 ? 'bg-accent text-accent-ink' : 'border border-line text-ink'
                    }`}
                  >
                    {c.kind === 'ADD_CAPACITY' ? 'Confirm — add the time' : 'Apply this'}
                  </button>
                </form>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Each proposal is a concrete diff to the plan — queue order, capacity, or dates. Forward plan
        only; recorded evidence is never touched. Config {view.algorithmVersion}.
      </p>
      <div className="h-6" />
    </main>
  );
}
