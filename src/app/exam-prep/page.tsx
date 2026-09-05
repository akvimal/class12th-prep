import { uiContext } from '@/app-services/app-context';
import { getSatPrepOverview } from '@/app-services/sat-prep';
import { logSatPrepSessionAction } from '@/app/actions';
import {
  SAT_DOMAINS,
  SAT_DOMAIN_LABEL,
  SAT_DOMAIN_TIPS,
  SAT_DOMAIN_TOPICS,
  SAT_TREND_NOTE,
} from '@/domain/sat/sat-domain';
import { PageHeader, Card, Chip, SectionLabel, StatTile } from '@/components/ui';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FIELD = 'h-10 rounded-lg border border-line bg-card px-2 text-[13px] text-ink';

const TREND_CHIP: Record<string, { tone: 'ok' | 'warn' | 'bad' | 'default'; label: string }> = {
  IMPROVED: { tone: 'ok', label: 'Improving' },
  FLAT: { tone: 'warn', label: 'Flat' },
  REGRESSED: { tone: 'bad', label: 'Regressed' },
  NEW: { tone: 'default', label: 'New' },
};

const PHASE_LABEL: Record<string, string> = {
  DIAGNOSTIC: 'Diagnostic',
  CORRECTION: 'Correction',
  CONSOLIDATION: 'Consolidation',
  TAPER: 'Taper',
};

export default async function ExamPrepPage() {
  const { repos, studentId, asOf } = await uiContext();
  const overview = await getSatPrepOverview(repos, studentId, asOf);

  if (!overview) {
    return (
      <main>
        <PageHeader eyebrow="SAT prep" title="Exam prep" back="/more" />
        <p className="px-5 text-[13px] text-muted">
          No active SAT prep plan yet. Ask to start one once a test date is set.
        </p>
      </main>
    );
  }

  const {
    plan,
    attempts,
    priorities,
    weeks,
    currentWeek,
    sessions,
    daysUntilTest,
    minutesLoggedThisWeek,
  } = overview;
  const weeklyPct = plan.weeklyTargetMinutes
    ? Math.round((minutesLoggedThisWeek / plan.weeklyTargetMinutes) * 100)
    : 0;

  return (
    <main>
      <PageHeader eyebrow="SAT prep" title="Exam prep" back="/more" />

      <div className="grid grid-cols-2 gap-2.5 px-5">
        <StatTile
          label="Test date"
          value={formatDate(plan.testDate)}
          sub={daysUntilTest >= 0 ? `in ${daysUntilTest} days` : `${-daysUntilTest} days ago`}
        />
        <StatTile
          label="This week"
          value={currentWeek ? PHASE_LABEL[currentWeek.phase] : '—'}
          sub={currentWeek ? `week ${currentWeek.weekNumber} of ${weeks.length}` : undefined}
        />
      </div>

      <div className="mt-2.5 px-5">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Weekly time</span>
            <span className="font-mono text-[12px] text-muted">
              {minutesLoggedThisWeek}/{plan.weeklyTargetMinutes} min · {weeklyPct}%
            </span>
          </div>
          {currentWeek && currentWeek.focusDomains.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentWeek.focusDomains.map((d) => (
                <Chip key={d} tone="accent">
                  {SAT_DOMAIN_LABEL[d]}
                </Chip>
              ))}
              {currentWeek.fullPracticeTest && <Chip tone="warn">Full practice test</Chip>}
            </div>
          )}
        </Card>
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Score trend</SectionLabel>
      <div className="px-5">
        {attempts.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0"
          >
            <div>
              <div className="text-[13px] font-semibold text-ink">Attempt {a.attemptNumber}</div>
              <div className="font-mono text-[11px] text-faint">{formatDate(a.testDate)}</div>
            </div>
            <div className="text-right font-mono text-[12px] text-muted">
              <div className="text-[15px] font-bold text-ink">{a.totalScore}</div>
              R&amp;W {a.readingWritingScore} · Math {a.mathScore}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Domain priority</SectionLabel>
      <div className="flex flex-col gap-2 px-5">
        {priorities.map((p) => {
          const trend = TREND_CHIP[p.trend]!;
          return (
            <Card key={p.domain}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-ink">
                    {SAT_DOMAIN_LABEL[p.domain]}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-faint">
                    {p.latestBand.low}–{p.latestBand.high}
                    {p.previousBand ? ` (was ${p.previousBand.low}–${p.previousBand.high})` : ''}
                  </div>
                </div>
                <Chip tone={trend.tone}>{trend.label}</Chip>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {SAT_TREND_NOTE[p.trend]}
              </p>

              <details className="mt-2 border-t border-line-soft pt-2">
                <summary className="cursor-pointer list-none text-[11px] font-semibold text-ink">
                  Topics &amp; tips
                </summary>
                <div className="mt-2 flex flex-col gap-2.5">
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-faint">
                      What this covers
                    </div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-muted">
                      {SAT_DOMAIN_TOPICS[p.domain].map((topic) => (
                        <li key={topic}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-faint">
                      Tips to score better
                    </div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] text-muted">
                      {SAT_DOMAIN_TIPS[p.domain].map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </Card>
          );
        })}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">
        Weekly plan · {formatDate(plan.startDate)} – {formatDate(plan.testDate)}
      </SectionLabel>
      <div className="px-5">
        {weeks.map((w) => (
          <div
            key={w.weekNumber}
            className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0"
          >
            <div>
              <div className="text-[13px] font-medium text-ink">
                Week {w.weekNumber} · {PHASE_LABEL[w.phase]}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-faint">
                {formatDate(w.startDate)} – {formatDate(w.endDate)}
                {w.focusDomains.length > 0 &&
                  ` · ${w.focusDomains.map((d) => SAT_DOMAIN_LABEL[d]).join(', ')}`}
              </div>
            </div>
            {w.fullPracticeTest && <Chip tone="warn">Test</Chip>}
          </div>
        ))}
      </div>

      <SectionLabel className="px-5 pb-2 pt-6">Log a session</SectionLabel>
      <div className="px-5">
        <Card>
          <form action={logSatPrepSessionAction} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="planId" value={plan.id} />
            <label className="col-span-2 flex flex-col gap-1">
              <SectionLabel>Domain</SectionLabel>
              <select name="domain" className={FIELD} defaultValue="">
                <option value="">General / mixed</option>
                {SAT_DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {SAT_DOMAIN_LABEL[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <SectionLabel>Date</SectionLabel>
              <input
                type="date"
                name="sessionDate"
                className={FIELD}
                defaultValue={asOf}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <SectionLabel>Minutes</SectionLabel>
              <input
                type="number"
                name="actualMinutes"
                className={FIELD}
                min={1}
                max={600}
                defaultValue={60}
                required
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" name="fullPracticeTest" className="h-4 w-4" />
              Full-length practice test
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <SectionLabel>Notes</SectionLabel>
              <input type="text" name="notes" className={FIELD} placeholder="Optional" />
            </label>
            <button
              type="submit"
              className="col-span-2 mt-1 h-10 rounded-xl bg-ink text-[13px] font-semibold text-paper"
            >
              Log session
            </button>
          </form>
        </Card>
      </div>

      {sessions.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-2 pt-6">Session history</SectionLabel>
          <div className="px-5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0"
              >
                <div>
                  <div className="text-[13px] font-medium text-ink">
                    {s.domain ? SAT_DOMAIN_LABEL[s.domain] : 'General / mixed'}
                    {s.fullPracticeTest ? ' · Full test' : ''}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-faint">
                    {formatDate(s.sessionDate)}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </div>
                </div>
                <span className="font-mono text-[12px] text-muted">{s.actualMinutes} min</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="h-6" />
    </main>
  );
}
