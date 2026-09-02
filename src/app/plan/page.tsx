import { uiContext } from '@/app-services/app-context';
import { getPlanOverview } from '@/app-services/plan';
import { daysBetween } from '@/domain/planning/dates';
import { PageHeader, Card, SectionLabel, StatTile } from '@/components/ui';
import { PhaseStrip } from '@/components/phase-strip';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const { repos, planId, asOf } = await uiContext();
  const plan = await getPlanOverview(repos, planId, asOf);
  if (!plan) return <p className="p-5 text-sm text-muted">No plan.</p>;

  const p = plan.plan;
  const milestones: [string, string][] = [
    ['Plan start', p.startDate],
    ['Syllabus target', p.syllabusTargetDate],
    ['Hard completion', p.hardCompletionDate],
    ['Revision starts', p.revisionStartDate],
    ['Board window opens', p.examWindowStart],
    ['Board window ends', p.examWindowEnd],
  ];

  return (
    <main>
      <PageHeader eyebrow="Plan & dates" title="Your preparation plan" back="/more" />

      <div className="px-5">
        <PhaseStrip phases={plan.phases} current={plan.currentPhase} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-5">
        <StatTile
          label="Weekday capacity"
          value={`${Math.floor(p.weekdayCapacityMinutes / 60)}h ${p.weekdayCapacityMinutes % 60}m`}
        />
        <StatTile
          label="Weekend capacity"
          value={`${Math.floor(p.weekendCapacityMinutes / 60)}h ${p.weekendCapacityMinutes % 60}m`}
        />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Milestones</SectionLabel>
      <div className="px-5">
        <ol className="relative border-l border-line pl-5">
          {milestones.map(([label, date]) => {
            const d = daysBetween(asOf, date);
            return (
              <li key={label} className="relative pb-5 last:pb-0">
                <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full border-2 border-paper bg-ink" />
                <div className="text-[13px] font-semibold text-ink">{label}</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted">
                  {formatDate(date)}
                  {d > 0 ? ` · in ${d} days` : d === 0 ? ' · today' : ` · ${-d} days ago`}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Resolved phases</SectionLabel>
      <div className="flex flex-col gap-2 px-5">
        {plan.phases.map((ph) => (
          <Card key={ph.phaseType} className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">{titleCase(ph.phaseType)}</span>
            <span className="font-mono text-[11px] text-muted">
              {formatDate(ph.startDate)} – {formatDate(ph.endDate)}
            </span>
          </Card>
        ))}
      </div>

      <p className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Phases are derived from these six dates — no month logic. Editing a date re-resolves every
        phase and re-prices the daily capacity.
      </p>
      <div className="h-6" />
    </main>
  );
}
