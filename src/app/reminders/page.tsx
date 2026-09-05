import { uiContext } from '@/app-services/app-context';
import { getWeeklyRhythm, listStudyWindows } from '@/app-services/study-windows';
import {
  addStudyWindowAction,
  deleteStudyWindowAction,
  editStudyWindowAction,
  toggleStudyWindowAction,
} from '@/app/actions';
import { PageHeader, Card, Chip, SectionLabel, StatTile } from '@/components/ui';
import { ClockIcon } from '@/components/icons';
import { windowMinutes } from '@/domain/planning/study-window';
import { formatWeekday } from '@/lib/format';

export const dynamic = 'force-dynamic';

const DAY_LABEL: Record<string, string> = {
  WEEKDAY: 'Mon–Fri',
  WEEKEND: 'Sat–Sun',
  DAILY: 'Every day',
};

const STATUS: Record<string, { chip: 'ok' | 'warn' | 'bad' | 'default'; label: string }> = {
  MET: { chip: 'ok', label: 'Met' },
  SHORT: { chip: 'warn', label: 'Short' },
  MISSED: { chip: 'bad', label: 'Missed' },
  NONE_PLANNED: { chip: 'default', label: '—' },
};

function Toggle({
  windowId,
  field,
  on,
  label,
}: {
  windowId: string;
  field: 'enabled' | 'reminderEnabled';
  on: boolean;
  label: string;
}) {
  return (
    <form action={toggleStudyWindowAction}>
      <input type="hidden" name="windowId" value={windowId} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={on ? '0' : '1'} />
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`relative block h-6 w-11 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-track'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-all ${on ? 'right-0.5' : 'left-0.5'}`}
        />
      </button>
    </form>
  );
}

const FIELD = 'h-10 rounded-lg border border-line bg-card px-2 text-[13px] text-ink';

export default async function RemindersPage() {
  const { repos, academicYearId, asOf } = await uiContext();
  const [windows, rhythm] = await Promise.all([
    listStudyWindows(repos, academicYearId),
    getWeeklyRhythm(repos, academicYearId, asOf),
  ]);

  const pct = rhythm ? Math.round(rhythm.adherenceRate * 100) : 0;

  return (
    <main>
      <PageHeader eyebrow="Rhythm & reminders" title="Study windows" back="/more" />

      <div className="grid grid-cols-2 gap-2.5 px-5">
        <StatTile
          label="Adherence · 7d"
          value={rhythm ? `${rhythm.metDays}/${rhythm.plannedDays}` : '—'}
          sub={`${pct}% of planned days`}
        />
        <StatTile label="Windows" value={windows.filter((w) => w.enabled).length} sub="enabled" />
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Your windows</SectionLabel>
      <div className="flex flex-col gap-2.5 px-5">
        {windows.map((w) => (
          <Card key={w.id} className="flex flex-col gap-2.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <ClockIcon size={15} className="text-muted" />
                  {w.startTime} – {w.endTime}
                </div>
                <div className="mt-1 text-[11px] text-faint">
                  {DAY_LABEL[w.dayType]}
                  {w.label ? ` · ${w.label}` : ''} · {windowMinutes(w)} min
                </div>
              </div>
              <Toggle windowId={w.id} field="enabled" on={w.enabled} label="Window enabled" />
            </div>
            <div className="flex items-center justify-between border-t border-line-soft pt-2">
              <span className="text-[11px] font-medium text-muted">Reminder</span>
              <div className="flex items-center gap-3">
                <Toggle
                  windowId={w.id}
                  field="reminderEnabled"
                  on={w.reminderEnabled}
                  label="Reminder enabled"
                />
                <form action={deleteStudyWindowAction}>
                  <input type="hidden" name="windowId" value={w.id} />
                  <button type="submit" className="text-[11px] font-semibold text-bad">
                    Remove
                  </button>
                </form>
              </div>
            </div>
            <details className="border-t border-line-soft pt-2">
              <summary className="cursor-pointer list-none text-[11px] font-semibold text-ink">
                Edit
              </summary>
              <form action={editStudyWindowAction} className="mt-2 grid grid-cols-2 gap-3 pb-1">
                <input type="hidden" name="windowId" value={w.id} />
                <label className="col-span-2 flex flex-col gap-1">
                  <SectionLabel>Days</SectionLabel>
                  <select name="dayType" className={FIELD} defaultValue={w.dayType}>
                    <option value="WEEKDAY">Mon–Fri</option>
                    <option value="WEEKEND">Sat–Sun</option>
                    <option value="DAILY">Every day</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <SectionLabel>Start</SectionLabel>
                  <input
                    type="time"
                    name="startTime"
                    className={FIELD}
                    defaultValue={w.startTime}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <SectionLabel>End</SectionLabel>
                  <input
                    type="time"
                    name="endTime"
                    className={FIELD}
                    defaultValue={w.endTime}
                    required
                  />
                </label>
                <label className="col-span-2 flex flex-col gap-1">
                  <SectionLabel>Label</SectionLabel>
                  <input
                    type="text"
                    name="label"
                    className={FIELD}
                    defaultValue={w.label ?? ''}
                    placeholder="e.g. After school"
                  />
                </label>
                <button
                  type="submit"
                  className="col-span-2 mt-1 h-10 rounded-xl bg-ink text-[13px] font-semibold text-paper"
                >
                  Save changes
                </button>
              </form>
            </details>
          </Card>
        ))}
      </div>

      <details className="mx-5 mt-3 rounded-xl border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-ink">
          Add a window
        </summary>
        <form
          action={addStudyWindowAction}
          className="grid grid-cols-2 gap-3 border-t border-line px-4 py-4"
        >
          <label className="col-span-2 flex flex-col gap-1">
            <SectionLabel>Days</SectionLabel>
            <select name="dayType" className={FIELD} defaultValue="WEEKDAY">
              <option value="WEEKDAY">Mon–Fri</option>
              <option value="WEEKEND">Sat–Sun</option>
              <option value="DAILY">Every day</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <SectionLabel>Start</SectionLabel>
            <input type="time" name="startTime" className={FIELD} defaultValue="17:00" required />
          </label>
          <label className="flex flex-col gap-1">
            <SectionLabel>End</SectionLabel>
            <input type="time" name="endTime" className={FIELD} defaultValue="18:30" required />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <SectionLabel>Label</SectionLabel>
            <input type="text" name="label" className={FIELD} placeholder="e.g. After school" />
          </label>
          <button
            type="submit"
            className="col-span-2 mt-1 h-10 rounded-xl bg-ink text-[13px] font-semibold text-paper"
          >
            Add window
          </button>
        </form>
      </details>

      <SectionLabel className="px-5 pb-2 pt-6">Adherence · last 7 days</SectionLabel>
      <div className="px-5">
        {rhythm?.days
          .slice()
          .reverse()
          .map((d) => {
            const s = STATUS[d.status]!;
            return (
              <div
                key={d.date}
                className="flex items-center justify-between border-b border-line-soft py-3 last:border-0"
              >
                <div>
                  <div className="text-[13px] font-medium text-ink">{formatWeekday(d.date)}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-faint">
                    {d.doneMinutes}/{d.plannedMinutes} min
                  </div>
                </div>
                <Chip tone={s.chip}>{s.label}</Chip>
              </div>
            );
          })}
      </div>

      <p className="mx-5 mt-4 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Windows drive reminders and this adherence metric — they never create tasks. Delivery
        (calendar, push) is the notifications phase.
      </p>
      <div className="h-6" />
    </main>
  );
}
