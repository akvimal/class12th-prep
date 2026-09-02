import { DEMO_DATE, demo } from '@/app-services/demo';
import { getPlanOverview } from '@/app-services/plan';
import { PageHeader, Card, Chip, SectionLabel, StatTile } from '@/components/ui';
import { ClockIcon, CheckIcon, AlertIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

const WINDOWS = [
  { days: 'Mon–Fri', time: '17:00 – 18:30', label: 'After school', minutes: 90 },
  { days: 'Mon–Fri', time: '20:30 – 21:00', label: 'Recall block', minutes: 30 },
  { days: 'Sat–Sun', time: '09:30 – 13:30', label: 'Deep work', minutes: 240 },
];

const ADHERENCE = [
  { date: 'Mon 1 Sep', planned: 120, done: 120, status: 'met' },
  { date: 'Sun 31 Aug', planned: 240, done: 150, status: 'short' },
  { date: 'Sat 30 Aug', planned: 240, done: 260, status: 'met' },
  { date: 'Fri 29 Aug', planned: 120, done: 0, status: 'missed' },
  { date: 'Thu 28 Aug', planned: 120, done: 130, status: 'met' },
];

const STATUS: Record<string, { chip: 'ok' | 'warn' | 'bad'; label: string }> = {
  met: { chip: 'ok', label: 'Met' },
  short: { chip: 'warn', label: 'Short' },
  missed: { chip: 'bad', label: 'Missed' },
};

export default async function RemindersPage() {
  const { repos, planId } = await demo();
  const plan = await getPlanOverview(repos, planId, DEMO_DATE);
  const weekday = plan?.plan.weekdayCapacityMinutes ?? 120;

  const met = ADHERENCE.filter((a) => a.status === 'met').length;

  return (
    <main>
      <PageHeader eyebrow="Rhythm & reminders" title="Study windows" back="/more" />

      <div className="grid grid-cols-2 gap-2.5 px-5">
        <StatTile label="This week" value={`${met}/${ADHERENCE.length}`} sub="windows met" />
        <StatTile
          label="Weekday target"
          value={`${Math.floor(weekday / 60)}h ${weekday % 60}m`}
          sub="from plan"
        />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Daily windows</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {WINDOWS.map((w) => (
          <Card key={w.label} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <ClockIcon size={15} className="text-muted" />
                {w.time}
              </div>
              <div className="mt-1 text-[11px] text-faint">
                {w.days} · {w.label} · {w.minutes} min
              </div>
            </div>
            <span
              className="relative h-6 w-11 rounded-full bg-accent"
              aria-label="Reminder on"
              role="switch"
              aria-checked="true"
            >
              <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-card" />
            </span>
          </Card>
        ))}
      </div>

      <div className="mx-5 mt-3 flex items-center justify-between rounded-xl border border-line px-3.5 py-3">
        <div>
          <div className="text-[13px] font-semibold text-ink">Sync to calendar</div>
          <div className="mt-0.5 text-[11px] text-faint">Blocks appear in Google Calendar</div>
        </div>
        <span
          className="relative h-6 w-11 rounded-full bg-track"
          aria-label="Calendar sync off"
          role="switch"
          aria-checked="false"
        >
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow-sm" />
        </span>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Adherence · last 5 days</SectionLabel>
      <div className="px-5">
        {ADHERENCE.map((a) => {
          const s = STATUS[a.status]!;
          return (
            <div
              key={a.date}
              className="flex items-center justify-between border-b border-line-soft py-3 last:border-0"
            >
              <div>
                <div className="text-[13px] font-medium text-ink">{a.date}</div>
                <div className="mt-0.5 font-mono text-[11px] text-faint">
                  {a.done}/{a.planned} min
                </div>
              </div>
              <Chip tone={s.chip}>
                {a.status === 'met' ? <CheckIcon size={11} /> : <AlertIcon size={11} />}
                {s.label}
              </Chip>
            </div>
          );
        })}
      </div>

      <div className="mx-5 mt-4 flex flex-col gap-1.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
        <div className="text-[13px] font-semibold text-ink">One window missed on Fri</div>
        <p className="text-[11px] leading-relaxed text-muted">
          Rather than doubling Saturday, the 120 min was spread as +40 across Sat, Sun and Mon. If
          two windows slip in a week, the plan proposes a course correction.
        </p>
      </div>
      <div className="h-6" />
    </main>
  );
}
