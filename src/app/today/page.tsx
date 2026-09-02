import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { getCapacityRange } from '@/app-services/calendar';
import { ClockIcon, InfoIcon, PlayIcon, ChevronRight } from '@/components/icons';
import { Card, SectionLabel } from '@/components/ui';
import { formatWeekday, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const VERBS = ['PRACTISE', 'LEARN', 'ACTIVE_RECALL'] as const;
const MINUTES = [40, 35, 20];

export default async function TodayPage() {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const range = await getCapacityRange(repos, planId, asOf, asOf);
  const capacity = range?.days[0]?.minutes ?? 0;
  const tasks = overview.needsAttention.slice(0, 3);

  return (
    <main>
      <header className="px-5 pb-2 pt-5">
        <SectionLabel>
          {formatWeekday(asOf)} · {titleCase(overview.currentPhase ?? '')}
        </SectionLabel>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-tight text-ink">Today</h1>
      </header>

      <div className="mx-5 mt-1.5 flex flex-col gap-3 rounded-xl border border-line px-3.5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <ClockIcon size={16} className="text-muted" />
            {Math.floor(capacity / 60)}h {String(capacity % 60).padStart(2, '0')}m planned
          </span>
          <span className="text-[11px] font-medium text-faint">from your plan &amp; calendar</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-[11px] font-medium text-faint self-center">Energy</span>
          {['Low', 'OK', 'High'].map((e) => (
            <span
              key={e}
              className={`flex-1 rounded-lg py-2 text-center text-[12px] font-semibold ${
                e === 'OK'
                  ? 'border-[1.5px] border-ink bg-ink text-paper'
                  : 'border border-line text-muted'
              }`}
            >
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] border-l-faint px-3.5 py-3">
        <InfoIcon size={15} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-[11px] leading-relaxed text-muted">
          Missed a task? It returns to the queue and is re‑prioritised — nothing is silently piled
          onto tomorrow.
        </p>
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">Primary · {tasks.length} tasks</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {tasks.map((task, i) => (
          <Card key={task.chapterKey} lead={i === 0} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                {task.subjectName} · {titleCase(VERBS[i]!)}
              </span>
              <span className="font-mono text-[11px] text-muted">{MINUTES[i]} min</span>
            </div>
            <div className="font-display text-[18px] font-bold leading-tight text-ink">
              {task.chapterName}
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              Readiness {task.readiness}/100{task.reasons[0] ? ` · ${task.reasons[0]}` : ''}
            </p>
            {i === 0 ? (
              <>
                <Link
                  href={`/subjects/${task.subjectKey}/${task.chapterKey}`}
                  className="flex items-center gap-1 text-[12px] font-semibold text-accent"
                >
                  <InfoIcon size={13} /> Why this?
                </Link>
                <Link
                  href="/session"
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-accent-ink"
                >
                  <PlayIcon size={15} /> Start
                </Link>
              </>
            ) : (
              <div className="flex items-center justify-between pt-0.5">
                <Link
                  href={`/subjects/${task.subjectKey}/${task.chapterKey}`}
                  className="text-[12px] font-semibold text-accent"
                >
                  Why this?
                </Link>
                <Link
                  href="/session"
                  className="flex items-center gap-1 text-[12px] font-semibold text-ink"
                >
                  Start <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </Card>
        ))}
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">If time remains</SectionLabel>
      <div className="px-5">
        <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-3.5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-muted">Computer Science · SQL</div>
            <div className="mt-0.5 text-[11px] text-faint">Light practice · 15 min</div>
          </div>
          <span className="text-[20px] font-semibold text-faint">+</span>
        </div>
      </div>
      <div className="h-6" />
    </main>
  );
}
