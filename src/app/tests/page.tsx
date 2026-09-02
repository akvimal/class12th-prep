import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { listUpcomingAssessments } from '@/app-services/assessment';
import { listQuestionErrors } from '@/app-services/assessment-results';
import { getErrorPatterns } from '@/app-services/error-patterns';
import { advanceErrorAction } from '@/app/actions';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { PlusIcon } from '@/components/icons';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const NEXT_LABEL: Record<string, string> = {
  NEW: 'Mark reviewed',
  REVIEWED: 'Mark corrected',
  CORRECTED: 'Schedule retest',
  RETEST_DUE: 'Passed retest',
};
const NEXT_TRANSITION: Record<string, string> = {
  NEW: 'REVIEW',
  REVIEWED: 'CORRECT',
  CORRECTED: 'SCHEDULE_RETEST',
  RETEST_DUE: 'PASS_RETEST',
};

export default async function TestsPage() {
  const { repos, academicYearId, asOf } = await uiContext();
  const [upcoming, openErrors, patterns] = await Promise.all([
    listUpcomingAssessments(repos, academicYearId, asOf),
    listQuestionErrors(repos, academicYearId, { limit: 12 }),
    getErrorPatterns(repos, academicYearId),
  ]);
  const unmastered = openErrors.filter((e) => e.state !== 'MASTERED');

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
                href={`/tests/result?assessment=${a.id}`}
                className="mt-1 self-start text-[12px] font-semibold text-accent"
              >
                Enter result after the test →
              </Link>
            </Card>
          ))}
        </div>
      )}

      {patterns.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-2 pt-6">Recurring · {patterns.length}</SectionLabel>
          <div className="flex flex-col gap-2.5 px-5">
            {patterns.map((p) => (
              <Card
                key={`${p.scope}-${p.chapterId ?? p.subjectId}-${p.errorType}`}
                className="flex flex-col gap-1.5 border-l-[3px] border-l-warn"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">
                    {titleCase(p.errorType)}
                    <span className="font-normal text-faint">
                      {' '}
                      ·{' '}
                      {p.scope === 'CHAPTER' ? p.chapterName : `${p.subjectName} (across chapters)`}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] text-bad">−{p.marksLost}</span>
                </div>
                <div className="text-[11px] leading-relaxed text-muted">
                  {p.occurrences}× since {formatDate(p.firstSeen)} ·{' '}
                  {p.knowledgeGap
                    ? 'a knowledge gap — revisit the concept'
                    : 'an exam-technique slip'}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionLabel className="px-5 pb-2 pt-6">
        Errors to clear{unmastered.length > 0 ? ` · ${unmastered.length}` : ''}
      </SectionLabel>
      {unmastered.length === 0 ? (
        <p className="px-5 text-[13px] text-muted">
          No open errors. Enter a result above after a test to log where marks went.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 px-5">
          {unmastered.map((e) => (
            <Card key={e.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink">
                  {e.chapterName} <span className="font-normal text-faint">· {e.subjectName}</span>
                </span>
                <span className="font-mono text-[12px] text-bad">−{e.marksLost}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip>{titleCase(e.errorType)}</Chip>
                <Chip tone={e.state === 'RETEST_DUE' ? 'warn' : 'default'}>
                  {titleCase(e.state)}
                </Chip>
              </div>
              {NEXT_TRANSITION[e.state] && (
                <form action={advanceErrorAction} className="self-start">
                  <input type="hidden" name="errorId" value={e.id} />
                  <input type="hidden" name="transition" value={NEXT_TRANSITION[e.state]} />
                  <button type="submit" className="text-[12px] font-semibold text-accent">
                    {NEXT_LABEL[e.state]} →
                  </button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
      <div className="h-6" />
    </main>
  );
}
