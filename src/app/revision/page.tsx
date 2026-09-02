import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getRevisionQueue, type RevisionQueueItem } from '@/app-services/revision';
import { SectionLabel } from '@/components/ui';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** RevisionMethod → the study-session type the log form expects. */
const METHOD_TO_SESSION: Record<string, string> = {
  ACTIVE_RECALL: 'ACTIVE_RECALL',
  BLANK_PAGE: 'REVISION',
  PRACTISE: 'PRACTISE',
  PYQ: 'PYQ',
  FLASHCARDS: 'ACTIVE_RECALL',
};

function Item({ item }: { item: RevisionQueueItem }) {
  const sessionType = METHOD_TO_SESSION[item.method] ?? 'REVISION';
  return (
    <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-3.5">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink">
          {item.chapterName} <span className="font-normal text-faint">· {item.subjectName}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted">
          R{item.revisionNumber} · {titleCase(item.method)}
          {item.daysUntil < 0
            ? ` · ${-item.daysUntil}d overdue`
            : item.daysUntil === 0
              ? ' · due today'
              : ` · in ${item.daysUntil}d`}
        </div>
      </div>
      <Link
        href={`/session?chapter=${item.chapterKey}&subject=${item.subjectKey}&type=${sessionType}&minutes=25`}
        className="ml-3 h-9 shrink-0 rounded-lg bg-ink px-4 text-[12px] font-semibold leading-9 text-paper"
      >
        Start
      </Link>
    </div>
  );
}

export default async function RevisionPage() {
  const { repos, academicYearId, asOf } = await uiContext();
  const queue = await getRevisionQueue(repos, academicYearId, asOf);
  if (!queue) return <p className="p-5 text-sm text-muted">No data.</p>;

  const nothing = queue.overdue.length + queue.dueToday.length + queue.upcoming.length === 0;

  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Revision</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Spaced retrieval — short, active, testing‑style. Intervals 1/3/7/14/30 days, adjusted by
          how each one goes.
        </p>
      </header>

      {queue.overdue.length > 1 && (
        <div className="mx-5 flex flex-col gap-1.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
          <div className="text-[13px] font-semibold text-ink">
            {queue.overdue.length} items slipped
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Clear the oldest first — a WEAK or FAILED outcome automatically shortens the next gap,
            so they won&apos;t pile up.
          </p>
        </div>
      )}

      {nothing && (
        <p className="px-5 text-[13px] text-muted">
          Nothing to revise yet. Revisions get scheduled once a chapter reaches “Learned” — set that
          on a chapter&apos;s{' '}
          <Link href="/subjects" className="text-accent">
            ratings
          </Link>
          .
        </p>
      )}

      {queue.overdue.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1.5 pt-6">Overdue · {queue.overdue.length}</SectionLabel>
          <div className="flex flex-col gap-2.5 px-5">
            {queue.overdue.map((i) => (
              <Item key={i.scheduleId} item={i} />
            ))}
          </div>
        </>
      )}

      {queue.dueToday.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1.5 pt-6">
            Due today · {queue.dueToday.length}
          </SectionLabel>
          <div className="flex flex-col gap-2.5 px-5">
            {queue.dueToday.map((i) => (
              <Item key={i.scheduleId} item={i} />
            ))}
          </div>
        </>
      )}

      {queue.upcoming.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1.5 pt-6">Upcoming</SectionLabel>
          <div className="px-5">
            {queue.upcoming.map((i) => (
              <div
                key={i.scheduleId}
                className="flex justify-between border-b border-line-soft py-3 last:border-0"
              >
                <span className="text-[13px] font-medium text-ink">
                  {i.chapterName} <span className="text-faint">· {i.subjectName}</span>
                </span>
                <span className="font-mono text-[11px] text-faint">in {i.daysUntil}d</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mx-5 mt-5 flex items-center justify-between rounded-xl border border-line px-3.5 py-3">
        <span className="text-[12px] font-semibold text-muted">Revisions completed</span>
        <span className="font-mono text-[12px] text-faint">{queue.completedCount}</span>
      </div>
      <div className="h-6" />
    </main>
  );
}
