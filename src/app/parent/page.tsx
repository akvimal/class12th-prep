import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { Bar, Card, Chip, SectionLabel, StatTile } from '@/components/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function tone(r: number): 'ok' | 'warn' | 'bad' {
  if (r >= 65) return 'ok';
  if (r >= 50) return 'warn';
  return 'bad';
}

export default async function ParentPage() {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const onTrack = overview.overallReadiness >= 55;
  const atRisk = overview.subjects.filter((s) => s.readiness < 55);

  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <SectionLabel>Parent view · Demo Student</SectionLabel>
        <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-ink">
          Where things stand
        </h1>
      </header>

      <div className="mx-5 flex items-center justify-between rounded-xl border-[1.5px] border-ink px-4 py-3.5">
        <div>
          <div className="font-display text-[18px] font-bold text-ink">
            {onTrack ? 'On track' : 'Needs attention'}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            Overall readiness {overview.overallReadiness}% · syllabus target{' '}
            {formatDate(overview.syllabusTargetDate)}
          </div>
        </div>
        <Chip tone={onTrack ? 'ok' : 'warn'}>{overview.daysToSyllabusTarget}d left</Chip>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 px-5">
        <StatTile label="Subjects" value={overview.subjects.length} />
        <StatTile label="On track" value={overview.subjects.length - atRisk.length} />
        <StatTile label="At risk" value={atRisk.length} />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Subject readiness</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {overview.subjects.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px] font-medium text-ink">
              <span>{s.name}</span>
              <span className="font-mono text-faint">{s.readiness}%</span>
            </div>
            <Bar value={s.readiness} tone={tone(s.readiness)} />
          </div>
        ))}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">What we&apos;re doing about it</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {overview.needsAttention.map((c) => (
          <Card key={c.chapterKey} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink">
                {c.chapterName} <span className="font-normal text-faint">· {c.subjectName}</span>
              </span>
              <span className="font-mono text-[12px] text-bad">{c.readiness}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">
              Prioritised in the daily queue{c.reasons[0] ? ` — ${c.reasons[0].toLowerCase()}` : ''}
              .
            </p>
          </Card>
        ))}
      </div>

      <div className="mx-5 mt-5 flex flex-col gap-1.5 rounded-xl border border-line px-3.5 py-3">
        <div className="text-[12px] font-semibold text-ink">Revision consistency</div>
        <div className="flex gap-1">
          {[1, 1, 0, 1, 1, 1, 0].map((hit, i) => (
            <span
              key={i}
              className={`h-6 flex-1 rounded ${hit ? 'bg-ok' : 'bg-track'}`}
              aria-label={hit ? 'studied' : 'missed'}
            />
          ))}
        </div>
        <p className="text-[11px] text-faint">5 of the last 7 days had a study session.</p>
      </div>

      <p className="mx-5 mt-4 rounded-lg border border-dashed border-line px-3 py-2 font-mono text-[10px] leading-relaxed text-faint">
        SYNTHETIC TEST DATA · read‑only summary · no marks shown without the student&apos;s consent
      </p>
      <div className="h-6" />
    </main>
  );
}
