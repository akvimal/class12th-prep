import Link from 'next/link';
import { DEMO_DATE, demo } from '@/app-services/demo';
import { getStudentOverview } from '@/app-services/overview';
import { PhaseStrip } from '@/components/phase-strip';
import { Bar, Chip, SectionLabel, StatTile, SyntheticNote } from '@/components/ui';
import { GearIcon } from '@/components/icons';
import { formatDate, formatWeekday } from '@/lib/format';

export const dynamic = 'force-dynamic';

function toneFor(readiness: number): 'ink' | 'warn' | 'bad' {
  if (readiness >= 65) return 'ink';
  if (readiness >= 45) return 'warn';
  return 'bad';
}

const NUM_COLOR: Record<'ink' | 'warn' | 'bad', string> = {
  ink: 'text-ink',
  warn: 'text-warn',
  bad: 'text-bad',
};

export default async function DashboardPage() {
  const { repos, academicYearId, planId } = await demo();
  const overview = await getStudentOverview(repos, academicYearId, planId, DEMO_DATE);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const onTrack = overview.overallReadiness >= 55;

  return (
    <main>
      <header className="flex items-start justify-between px-5 pb-3 pt-5">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
            Demo Student · CBSE XII
          </div>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">
            {formatWeekday(DEMO_DATE)}
          </h1>
        </div>
        <Link
          href="/more"
          aria-label="Settings"
          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted"
        >
          <GearIcon size={18} />
        </Link>
      </header>

      <div className="px-5">
        <PhaseStrip phases={overview.phases} current={overview.currentPhase} />
      </div>

      <section className="flex flex-col gap-3 px-5 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <SectionLabel>Overall readiness</SectionLabel>
            <div className="font-mono text-[52px] font-medium leading-none tracking-tight text-ink">
              {overview.overallReadiness}
              <span className="text-[22px] text-faint">%</span>
            </div>
          </div>
          <span
            className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${
              onTrack ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${onTrack ? 'bg-ok' : 'bg-warn'}`} />
            {onTrack ? 'On track' : 'Needs attention'}
          </span>
        </div>
        <Bar value={overview.overallReadiness} />
        <p className="text-[12px] leading-relaxed text-muted">
          Averaged across {overview.subjects.reduce((n, s) => n + s.chapters.length, 0)} chapters in{' '}
          {overview.subjects.length} subjects. Test &amp; recall evidence outweighs self‑rated
          confidence.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3">
        <StatTile
          label="Syllabus target"
          value={formatDate(overview.syllabusTargetDate)}
          sub={`${overview.daysToSyllabusTarget} days left`}
        />
        <StatTile
          label="Board exams"
          value={`from ${formatDate(overview.examWindowStart)}`}
          sub={`${overview.daysToExam} days left`}
        />
      </div>

      {overview.needsAttention.length > 0 && (
        <section className="flex flex-col gap-3 px-5 pt-6">
          <SectionLabel>Needs attention</SectionLabel>
          {overview.needsAttention.map((item) => (
            <Link
              key={item.chapterKey}
              href={`/subjects/${item.subjectKey}/${item.chapterKey}`}
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">{item.chapterName}</span>
                <span
                  className={`font-mono text-[13px] font-medium ${NUM_COLOR[toneFor(item.readiness)]}`}
                >
                  {item.readiness}
                </span>
              </div>
              <Bar value={item.readiness} tone={toneFor(item.readiness)} />
              <div className="flex flex-wrap gap-1.5">
                <Chip>{item.subjectName}</Chip>
                {item.reasons.map((r) => (
                  <Chip key={r} tone="warn">
                    {r}
                  </Chip>
                ))}
              </div>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3.5 px-5 pt-6">
        <div className="flex items-center justify-between">
          <SectionLabel>Subjects</SectionLabel>
          <Link href="/subjects" className="text-[12px] font-medium text-accent">
            All chapters →
          </Link>
        </div>
        {overview.subjects.map((s) => (
          <Link key={s.key} href={`/subjects/${s.key}`} className="flex items-center gap-3">
            <span className="w-[92px] shrink-0 text-[13px] font-semibold text-ink">{s.name}</span>
            <Bar value={s.readiness} className="flex-1" />
            <span className="w-8 shrink-0 text-right font-mono text-[12px] text-muted">
              {s.readiness}
            </span>
          </Link>
        ))}
      </section>

      <SyntheticNote />
    </main>
  );
}
