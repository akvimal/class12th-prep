import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { getTodayPlan } from '@/app-services/today';
import { logStudyAction } from '@/app/actions';
import { ClockIcon, InfoIcon, PlayIcon, CheckIcon } from '@/components/icons';
import { Card, SectionLabel } from '@/components/ui';
import type { PlannerEnergy } from '@/domain/planning/daily-planner';
import { formatWeekday, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ENERGIES: PlannerEnergy[] = ['LOW', 'OK', 'HIGH'];

const REASON_LABEL: Record<string, string> = {
  LOW_READINESS: 'Below readiness floor',
  SCHOOL_TEST_SOON: 'School test soon',
  REVISION_DUE: 'Revision due',
  HIGH_BOARD_WEIGHT: 'High board weight',
  BACKLOG: 'Carried over',
  REVISION_GUARD: 'Revision balance',
  STARVATION_GUARD: 'Overdue in the queue',
};

function fmt(mins: number): string {
  return `${Math.floor(mins / 60)}h ${String(Math.max(0, mins) % 60).padStart(2, '0')}m`;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: string }>;
}) {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const requested = (await searchParams).energy?.toUpperCase();
  const energy: PlannerEnergy = ENERGIES.includes(requested as PlannerEnergy)
    ? (requested as PlannerEnergy)
    : 'OK';

  const [plan, overview] = await Promise.all([
    getTodayPlan(repos, academicYearId, planId, asOf, energy),
    getStudentOverview(repos, academicYearId, planId, asOf),
  ]);
  if (!plan) return <p className="p-5 text-sm text-muted">No plan.</p>;

  const over = plan.plannedMinutes > plan.capacityMinutes;

  return (
    <main>
      <header className="px-5 pb-2 pt-5">
        <SectionLabel>
          {formatWeekday(asOf)} · {titleCase(overview?.currentPhase ?? '')}
        </SectionLabel>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-tight text-ink">Today</h1>
      </header>

      <div className="mx-5 mt-1.5 flex flex-col gap-3 rounded-xl border border-line px-3.5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <ClockIcon size={16} className="text-muted" />
            {fmt(plan.plannedMinutes)} planned
          </span>
          <span className="text-[11px] font-medium text-faint">
            of {fmt(plan.capacityMinutes)} capacity
          </span>
        </div>
        <div className="flex gap-1.5">
          <span className="self-center text-[11px] font-medium text-faint">Energy</span>
          {ENERGIES.map((e) => (
            <Link
              key={e}
              href={e === 'OK' ? '/today' : `/today?energy=${e.toLowerCase()}`}
              className={`flex-1 rounded-lg py-2 text-center text-[12px] font-semibold ${
                e === energy
                  ? 'border-[1.5px] border-ink bg-ink text-paper'
                  : 'border border-line text-muted'
              }`}
            >
              {titleCase(e)}
            </Link>
          ))}
        </div>
        {over && (
          <p className="text-[11px] leading-relaxed text-warn">
            A test-urgent task pushes this over capacity by{' '}
            {fmt(plan.plannedMinutes - plan.capacityMinutes)} — trim elsewhere or lower energy.
          </p>
        )}
      </div>

      <div className="mx-5 mt-3 flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] border-l-faint px-3.5 py-3">
        <InfoIcon size={15} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-[11px] leading-relaxed text-muted">
          Missed a task? It returns to the queue and is re‑prioritised — nothing is silently piled
          onto tomorrow.
        </p>
      </div>

      <SectionLabel className="px-5 pb-1.5 pt-6">
        Primary · {plan.primary.length} tasks
      </SectionLabel>
      {plan.primary.length === 0 ? (
        <p className="px-5 text-[13px] text-muted">
          Nothing in the queue for today — every in-play chapter is above the floor. Nice.
        </p>
      ) : (
        <div className="flex flex-col gap-3 px-5">
          {plan.primary.map((task, i) => {
            const c = task.candidate;
            return (
              <Card key={c.id} lead={i === 0} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                    {c.subjectName} · {titleCase(c.activity)}
                  </span>
                  <span className="font-mono text-[11px] text-muted">{task.minutes} min</span>
                </div>
                <div className="font-display text-[18px] font-bold leading-tight text-ink">
                  {c.chapterName}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {task.reasons.slice(0, 3).map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-sink px-2 py-1 text-[10px] font-medium text-muted"
                    >
                      {REASON_LABEL[r] ?? r}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/subjects/${c.subjectKey}/${c.chapterKey}`}
                  className="flex items-center gap-1 text-[12px] font-semibold text-accent"
                >
                  <InfoIcon size={13} /> Why this?
                </Link>
                <div className="mt-1 flex gap-2">
                  <Link
                    href={`/session?chapter=${c.chapterKey}&subject=${c.subjectKey}&type=${c.activity}&minutes=${task.minutes}`}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-accent-ink"
                  >
                    <PlayIcon size={15} /> Start
                  </Link>
                  <form action={logStudyAction}>
                    <input type="hidden" name="subjectKey" value={c.subjectKey} />
                    <input type="hidden" name="chapterKey" value={c.chapterKey} />
                    <input type="hidden" name="type" value={c.activity} />
                    <input type="hidden" name="completion" value="YES" />
                    <input type="hidden" name="actualMinutes" value={task.minutes} />
                    <input type="hidden" name="redirectTo" value="/today" />
                    <button
                      type="submit"
                      aria-label={`Mark ${c.chapterName} done`}
                      className="flex h-11 items-center gap-1.5 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink"
                    >
                      <CheckIcon size={14} /> Done
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {plan.optional.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1.5 pt-6">If time remains</SectionLabel>
          <div className="flex flex-col gap-2 px-5">
            {plan.optional.map((task) => (
              <Link
                key={task.candidate.id}
                href={`/session?chapter=${task.candidate.chapterKey}&subject=${task.candidate.subjectKey}&type=${task.candidate.activity}&minutes=${task.minutes}`}
                className="flex items-center justify-between rounded-xl border border-dashed border-line px-3.5 py-3"
              >
                <div>
                  <div className="text-[13px] font-semibold text-muted">
                    {task.candidate.subjectName} · {task.candidate.chapterName}
                  </div>
                  <div className="mt-0.5 text-[11px] text-faint">
                    {titleCase(task.candidate.activity)} · {task.minutes} min
                  </div>
                </div>
                <span className="text-[20px] font-semibold text-faint">+</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Deterministic: the same plan, energy and progress always produce this list. Config{' '}
        <span className="font-semibold">{plan.algorithmVersion}</span>.
      </p>
      <div className="h-6" />
    </main>
  );
}
