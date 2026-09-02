import { DEMO_DATE, demo } from '@/app-services/demo';
import { getStudentOverview } from '@/app-services/overview';
import { listStudySessions } from '@/app-services/session';
import { addDays } from '@/domain/planning/dates';
import { Bar, Card, SectionLabel, StatTile } from '@/components/ui';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const { repos, academicYearId, planId } = await demo();
  const overview = await getStudentOverview(repos, academicYearId, planId, DEMO_DATE);
  const weekStart = addDays(DEMO_DATE, -7);
  const sessions =
    (await listStudySessions(repos, academicYearId, { from: weekStart, to: DEMO_DATE })) ?? [];

  const minutes = sessions.reduce((a, s) => a + s.actualMinutes, 0);
  const done = sessions.filter((s) => s.completion === 'YES').length;
  const byType = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] ?? 0) + 1;
    return acc;
  }, {});
  const attempted = sessions.reduce((a, s) => a + (s.attempted ?? 0), 0);
  const correct = sessions.reduce((a, s) => a + (s.correct ?? 0), 0);

  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <SectionLabel>
          Week of {weekStart.slice(5)} → {DEMO_DATE.slice(5)}
        </SectionLabel>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-tight text-ink">
          Weekly review
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-2.5 px-5">
        <StatTile label="Sessions" value={sessions.length} sub={`${done} full`} />
        <StatTile
          label="Time"
          value={`${Math.floor(minutes / 60)}h ${minutes % 60}m`}
          sub="logged"
        />
        <StatTile
          label="Accuracy"
          value={attempted ? `${Math.round((correct / attempted) * 100)}%` : '—'}
          sub={attempted ? `${correct}/${attempted}` : 'no practice'}
        />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">How the time split</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, n]) => (
            <div key={type} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[12px] font-medium text-ink">
                <span>{titleCase(type)}</span>
                <span className="font-mono text-faint">{n}</span>
              </div>
              <Bar value={(n / sessions.length) * 100} />
            </div>
          ))}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Readiness movement</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {overview?.subjects.map((s) => (
          <Card key={s.key} className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">{s.name}</span>
            <span className="font-mono text-[13px] text-ink">
              {s.readiness}
              <span className="text-faint">%</span>
            </span>
          </Card>
        ))}
      </div>

      <div className="mx-5 mt-5 flex flex-col gap-1.5 rounded-xl border border-line border-l-[3px] border-l-accent px-3.5 py-3">
        <div className="text-[13px] font-semibold text-ink">Next week&apos;s focus</div>
        <p className="text-[11px] leading-relaxed text-muted">
          Ray Optics and Integrals stayed flat — both are on the critical path to the 20 Dec
          syllabus target. They lead Today&apos;s queue until readiness clears 55.
        </p>
      </div>
      <div className="h-6" />
    </main>
  );
}
