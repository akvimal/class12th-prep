import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { listUpcomingAssessments } from '@/app-services/assessment';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { PlusIcon } from '@/components/icons';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TestsPage() {
  const { repos, academicYearId, asOf } = await uiContext();
  const upcoming = await listUpcomingAssessments(repos, academicYearId, asOf);

  return (
    <main>
      <header className="flex items-start justify-between px-5 pb-3.5 pt-5">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Tests</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            School tests raise a chapter&apos;s priority as they approach.
          </p>
        </div>
        <Link
          href="/tests/new"
          className="flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-ink px-3.5 text-[13px] font-semibold text-ink"
        >
          <PlusIcon size={14} /> Add
        </Link>
      </header>

      <SectionLabel className="px-5 pb-2">Upcoming · {upcoming.length}</SectionLabel>
      {upcoming.length === 0 ? (
        <p className="px-5 text-[13px] text-muted">
          No tests scheduled.{' '}
          <Link href="/tests/new" className="text-accent">
            Add one
          </Link>{' '}
          when the school announces it.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 px-5">
          {upcoming.map((a) => (
            <Card key={a.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {a.subjectName || a.subjectKey} · {titleCase(a.type.replace('SCHOOL_', ''))}
                </span>
                <span
                  className={`font-mono text-[12px] font-semibold ${a.daysUntil <= 3 ? 'text-bad' : 'text-warn'}`}
                >
                  {a.daysUntil <= 0 ? 'today' : `in ${a.daysUntil} days`}
                </span>
              </div>
              <div className="font-display text-[16px] font-bold leading-tight text-ink">
                {a.name}
              </div>
              <div className="font-mono text-[11px] text-muted">
                {formatDate(a.examDate)}
                {a.maxMarks ? ` · ${a.maxMarks} marks` : ''}
              </div>
              <div className="text-[11px] leading-relaxed text-muted">
                {a.chapters.map((c) => c.name).join(', ')}
              </div>
              <Link
                href="/tests/result"
                className="mt-1 self-start text-[12px] font-semibold text-accent"
              >
                Enter result after the test →
              </Link>
            </Card>
          ))}
        </div>
      )}

      <SectionLabel className="px-5 pb-2 pt-6">Recorded</SectionLabel>
      <div className="px-5">
        <Card className="flex flex-col gap-2">
          <div className="text-[11px] leading-relaxed text-muted">
            Results and error analysis arrive with the assessment-feedback phase. For now,{' '}
            <Link href="/subjects" className="text-accent">
              update a chapter&apos;s ratings
            </Link>{' '}
            after a test.
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip dashed>Marks-lost by chapter</Chip>
            <Chip dashed>Error types</Chip>
            <Chip dashed>Retest queue</Chip>
          </div>
        </Card>
      </div>
      <div className="h-6" />
    </main>
  );
}
