import { uiContext } from '@/app-services/app-context';
import { generateWeeklyReview } from '@/app-services/weekly-review';
import { getWeeklyRhythm } from '@/app-services/study-windows';
import { Bar, Card, SectionLabel, StatTile } from '@/components/ui';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

function fmtMins(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default async function ReviewPage() {
  const { repos, academicYearId, asOf } = await uiContext();

  const review = await generateWeeklyReview(repos, academicYearId, asOf, { announce: false });
  if (!review) return <p className="p-5 text-sm text-muted">No academic year.</p>;

  const rhythm = await getWeeklyRhythm(repos, academicYearId, review.weekEnd, 7);
  const totalMinutes = Object.values(review.timeByActivity).reduce((a, b) => a + b, 0) || 1;

  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <SectionLabel>
          Week of {review.weekStart.slice(5)} → {review.weekEnd.slice(5)}
        </SectionLabel>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-tight text-ink">
          Weekly review
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-2.5 px-5">
        <StatTile
          label="Sessions"
          value={review.sessionsLogged}
          sub={`${review.fullCompletions} full`}
        />
        <StatTile label="Time" value={fmtMins(review.minutesLogged)} sub="logged" />
        <StatTile
          label="Accuracy"
          value={review.accuracyPct != null ? `${review.accuracyPct}%` : '—'}
          sub={review.accuracyPct != null ? 'on practice' : 'no practice'}
        />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">
        Rhythm · {review.metDays}/{review.plannedDays} planned days met
      </SectionLabel>
      <div className="flex gap-1.5 px-5">
        {(rhythm?.days ?? []).map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-10 w-full rounded-md ${
                d.status === 'MET'
                  ? 'bg-ok'
                  : d.status === 'SHORT'
                    ? 'bg-warn'
                    : d.status === 'MISSED'
                      ? 'bg-bad'
                      : 'bg-sink'
              }`}
              title={`${d.date}: ${d.doneMinutes}/${d.plannedMinutes} min`}
            />
            <span className="font-mono text-[9px] text-faint">{d.date.slice(8)}</span>
          </div>
        ))}
      </div>
      <p className="px-5 pt-1.5 font-mono text-[10px] text-faint">
        Adherence {Math.round(review.adherenceRate * 100)}% · from your study windows vs. logged
        sessions
      </p>

      {Object.keys(review.timeByActivity).length > 0 && (
        <>
          <SectionLabel className="px-5 pb-2 pt-6">How the time split</SectionLabel>
          <div className="flex flex-col gap-3 px-5">
            {Object.entries(review.timeByActivity)
              .sort((a, b) => b[1] - a[1])
              .map(([type, mins]) => (
                <div key={type} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[12px] font-medium text-ink">
                    <span>{titleCase(type)}</span>
                    <span className="font-mono text-faint">{fmtMins(mins)}</span>
                  </div>
                  <Bar value={(mins / totalMinutes) * 100} />
                </div>
              ))}
          </div>
        </>
      )}

      <SectionLabel className="px-5 pb-2 pt-6">Readiness movement</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {review.readinessMovement.map((s) => (
          <Card key={s.subjectKey} className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">{s.subjectName}</span>
            <span className="flex items-baseline gap-2 font-mono text-[13px] text-ink">
              <span className="text-faint">{s.from}</span>→<span>{s.to}</span>
              <span
                className={`text-[11px] ${
                  s.delta > 0 ? 'text-ok' : s.delta < 0 ? 'text-bad' : 'text-faint'
                }`}
              >
                {s.delta > 0 ? `+${s.delta}` : s.delta}
              </span>
            </span>
          </Card>
        ))}
        {review.readinessMovement.length === 0 && (
          <p className="text-[12px] text-faint">No readiness snapshots in range yet.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        <StatTile label="Revisions done" value={review.revisionsDone} sub="this week" />
        <StatTile label="Errors logged" value={review.errorsLogged} sub="from tests" />
      </div>

      {review.focusNext.length > 0 && (
        <div className="mx-5 mt-5 flex flex-col gap-2 rounded-xl border border-line border-l-[3px] border-l-accent px-3.5 py-3">
          <div className="text-[13px] font-semibold text-ink">Next week&apos;s focus</div>
          <p className="text-[11px] leading-relaxed text-muted">
            Lowest readiness, still in play — these lead Today&apos;s queue.
          </p>
          <ul className="flex flex-col gap-1">
            {review.focusNext.map((c) => (
              <li key={c.chapterKey} className="flex justify-between text-[12px] text-ink">
                <span>{c.chapterName}</span>
                <span className="font-mono text-faint">{c.readiness}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Deterministic summary · config{' '}
        <span className="font-semibold">{review.algorithmVersion}</span>. Stored for week-over-week
        comparison.
      </p>
      <div className="h-6" />
    </main>
  );
}
