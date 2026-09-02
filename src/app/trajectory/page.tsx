import { DEMO_DATE, demo } from '@/app-services/demo';
import { getStudentOverview } from '@/app-services/overview';
import { PageHeader, Card, SectionLabel } from '@/components/ui';
import { TrajectoryChart, type TrajectoryPoint } from '@/components/trajectory-chart';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TARGET = 78;

export default async function TrajectoryPage() {
  const { repos, academicYearId, planId } = await demo();
  const overview = await getStudentOverview(repos, academicYearId, planId, DEMO_DATE);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const now = overview.overallReadiness;
  // synthetic "so far" curve leading to today, then a projection to the exam.
  const actual: TrajectoryPoint[] = [
    { t: 0, value: 44 },
    { t: 0.12, value: 51 },
    { t: 0.24, value: 58 },
    { t: 0.34, value: now },
  ];
  const projectedEnd = Math.min(90, Math.round(now + (TARGET - now) * 0.82));
  const projected: TrajectoryPoint[] = [
    { t: 0.34, value: now },
    { t: 0.62, value: Math.round(now + (projectedEnd - now) * 0.55) },
    { t: 1, value: projectedEnd },
  ];

  const gap = TARGET - projectedEnd;
  const pressure = Math.max(0, Math.min(100, 40 + gap * 6 + overview.needsAttention.length * 6));

  return (
    <main>
      <PageHeader eyebrow="Impact on your goal" title="Where this is heading" back="/more" />

      <div className="px-5">
        <Card lead className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                Projected board readiness
              </div>
              <div className="font-display text-[34px] font-bold leading-none text-ink">
                {projectedEnd}
                <span className="text-[16px] text-faint">/100</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-muted">
              target {TARGET}
              <br />
              by {formatDate(overview.examWindowStart)}
            </div>
          </div>
          <TrajectoryChart actual={actual} projected={projected} target={TARGET} nowT={0.34} />
          <p className="text-[12px] leading-relaxed text-muted">
            {gap <= 0
              ? 'Current pace clears the target with room to spare.'
              : `Current pace lands about ${gap} points short. Closing it needs the critical-path chapters to move, not the ones already strong.`}
          </p>
        </Card>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Plan pressure</SectionLabel>
      <div className="px-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-track">
          <div
            className={`h-full rounded-full ${pressure > 66 ? 'bg-bad' : pressure > 40 ? 'bg-warn' : 'bg-ok'}`}
            style={{ width: `${pressure}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
          <span>Comfortable</span>
          <span>Tight</span>
          <span>At risk</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {overview.daysToSyllabusTarget} days to the syllabus target ·{' '}
          {overview.needsAttention.length} chapters below the readiness floor · weekend capacity is
          the main lever left.
        </p>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">What moves the projection</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {overview.needsAttention.map((c) => (
          <Card key={c.chapterKey} className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink">
                {c.chapterName} <span className="font-normal text-faint">· {c.subjectName}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {c.readiness} now{c.reasons[0] ? ` · ${c.reasons[0]}` : ''}
              </div>
            </div>
            <span className="ml-3 shrink-0 font-mono text-[12px] font-semibold text-ok">
              +{2 + (c.reasons.includes('High board weight') ? 2 : 0)} pts
            </span>
          </Card>
        ))}
      </div>

      <div className="px-5 pt-5">
        <a
          href="/course-correction"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
        >
          See course correction options
        </a>
      </div>
      <div className="h-6" />
    </main>
  );
}
