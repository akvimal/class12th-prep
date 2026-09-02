import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { getBoardProjection } from '@/app-services/projection';
import { getReadinessTrend } from '@/app-services/readiness';
import { PageHeader, Card, SectionLabel } from '@/components/ui';
import { TrajectoryChart, type TrajectoryPoint } from '@/components/trajectory-chart';
import { daysBetween } from '@/domain/planning/dates';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TrajectoryPage() {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const [overview, projection, plan, trend] = await Promise.all([
    getStudentOverview(repos, academicYearId, planId, asOf),
    getBoardProjection(repos, academicYearId),
    repos.planning.getPlan(planId),
    getReadinessTrend(repos, academicYearId),
  ]);
  if (!overview || !projection || !plan) {
    return <p className="p-5 text-sm text-muted">No data.</p>;
  }

  const now = overview.overallReadiness;
  const span = Math.max(1, daysBetween(plan.startDate, overview.examWindowStart));
  const at = (iso: string) => Math.max(0, Math.min(1, daysBetween(plan.startDate, iso) / span));
  const nowT = at(asOf);

  const actualPoints: TrajectoryPoint[] = trend
    .map((p) => ({ t: at(p.on), value: p.readiness }))
    .filter((p) => p.t <= nowT + 0.001);
  if (actualPoints.length === 0 || actualPoints[actualPoints.length - 1]!.t < nowT - 0.001) {
    actualPoints.push({ t: nowT, value: now });
  }

  const { overall } = projection;
  const hasProjection = overall.projectedPct != null;
  const projectedPoints: TrajectoryPoint[] = hasProjection
    ? [
        { t: nowT, value: now },
        { t: 1, value: overall.projectedPct! },
      ]
    : [];

  const target = overall.targetPct ?? 78;
  const gap =
    hasProjection && overall.targetPct != null
      ? Math.round((overall.targetPct - overall.projectedPct!) * 10) / 10
      : null;

  return (
    <main>
      <PageHeader eyebrow="Impact on your goal" title="Where this is heading" back="/more" />

      <div className="px-5">
        <Card lead className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                Projected board score
              </div>
              {hasProjection ? (
                <div className="font-display text-[34px] font-bold leading-none text-ink">
                  {overall.projectedPct}
                  <span className="text-[16px] text-faint">%</span>
                </div>
              ) : (
                <div className="font-display text-[22px] font-bold leading-tight text-muted">
                  Not enough evidence yet
                </div>
              )}
            </div>
            <div className="text-right text-[11px] text-muted">
              {overall.targetPct != null ? (
                <>
                  target {overall.targetPct}%<br />
                </>
              ) : null}
              by {formatDate(overview.examWindowStart)}
            </div>
          </div>

          <TrajectoryChart
            actual={actualPoints}
            projected={projectedPoints}
            target={target}
            nowT={nowT}
          />

          <p className="text-[12px] leading-relaxed text-muted">
            {!hasProjection
              ? `A projection needs a graded test in a subject and readiness on most of its syllabus. ${overall.subjectsWithProjection}/${overall.totalSubjects} subjects qualify so far.`
              : gap == null
                ? 'No target set — add target marks per subject to see the gap.'
                : gap <= 0
                  ? `Current evidence clears the target by about ${Math.abs(gap)} points.`
                  : `Current evidence lands about ${gap} points short${
                      overall.marksOpportunity != null
                        ? ` — roughly ${overall.marksOpportunity} marks of opportunity`
                        : ''
                    }. It closes by moving the weak chapters below, not the strong ones.`}
          </p>
          <p className="font-mono text-[10px] text-faint">
            Conservative estimate · config {projection.algorithmVersion}
          </p>
        </Card>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">By subject</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {projection.subjects.map((s) => (
          <Card key={s.subjectKey} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-semibold text-ink">{s.subjectName}</span>
              {s.projectedPct != null ? (
                <span className="font-mono text-[13px] text-ink">
                  {s.projectedPct}%
                  {s.targetPct != null && (
                    <span className="text-faint"> / {s.targetPct}% target</span>
                  )}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-faint">no projection yet</span>
              )}
            </div>
            <div className="text-[11px] leading-relaxed text-muted">{s.drivers[0]}</div>
            {s.marksOpportunity != null && s.marksOpportunity > 0 && (
              <div className="font-mono text-[11px] text-warn">
                {s.marksOpportunity} marks of opportunity vs. target
              </div>
            )}
          </Card>
        ))}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Weakest on the critical path</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {overview.needsAttention.length === 0 ? (
          <p className="text-[12px] text-faint">Nothing below the readiness floor right now.</p>
        ) : (
          overview.needsAttention.map((c) => (
            <Card key={c.chapterKey} className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">
                  {c.chapterName} <span className="font-normal text-faint">· {c.subjectName}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {c.readiness} now{c.reasons[0] ? ` · ${c.reasons[0]}` : ''}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <div className="h-6" />
    </main>
  );
}
