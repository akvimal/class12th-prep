import Link from 'next/link';
import { notFound } from 'next/navigation';
import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { PageHeader, SectionLabel } from '@/components/ui';
import { ChevronRight } from '@/components/icons';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const DOT: Record<string, string> = {
  low: 'bg-bad',
  mid: 'bg-warn',
  ok: 'bg-ok',
};
const band = (r: number) => (r >= 65 ? 'ok' : r >= 45 ? 'mid' : 'low');
const FILL: Record<string, string> = { low: 'bg-bad', mid: 'bg-warn', ok: 'bg-ink' };

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectKey: string }>;
}) {
  const { subjectKey } = await params;
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  const subject = overview?.subjects.find((s) => s.key === subjectKey);
  if (!subject) notFound();

  return (
    <main>
      <PageHeader
        back="/subjects"
        eyebrow={subject.code ? `CBSE · CODE ${subject.code}` : 'CBSE XII'}
        title={subject.name}
      />

      <div className="flex items-end gap-3.5 px-5 pt-2">
        <div className="font-mono text-[44px] font-medium leading-none text-ink">
          {subject.readiness}
          <span className="text-[18px] text-faint">%</span>
        </div>
        <p className="pb-1.5 text-[12px] leading-relaxed text-muted">
          subject readiness
          <br />
          {subject.chapters.length} chapters · board exam not yet scheduled
        </p>
      </div>

      <SectionLabel className="px-5 pb-1 pt-6">Chapters</SectionLabel>
      <div className="px-5">
        {subject.chapters.map((c) => (
          <Link
            key={c.key}
            href={`/subjects/${subject.key}/${c.key}`}
            className="flex flex-col gap-2 border-b border-line-soft py-3.5 last:border-0"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-full ${DOT[band(c.readiness)]}`} />
                <span className="text-[15px] font-semibold text-ink">{c.name}</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[13px] font-medium text-muted">
                {c.readiness}
                <ChevronRight size={13} className="text-faint" />
              </span>
            </div>
            <span className="h-1 overflow-hidden rounded-full bg-track">
              <span
                className={`block h-full rounded-full ${FILL[band(c.readiness)]}`}
                style={{ width: `${c.readiness}%` }}
              />
            </span>
            <span className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded-md bg-sink px-1.5 py-1 font-medium text-muted">
                {titleCase(c.state)}
              </span>
              <span className="rounded-md bg-sink px-1.5 py-1 font-medium text-muted">
                School: {titleCase(c.schoolStatus)}
              </span>
              {(c.weight ?? 0) >= 8 && (
                <span className="rounded-md bg-warn-soft px-1.5 py-1 font-medium text-warn">
                  High weight
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>

      <div className="mx-5 mt-5 flex items-start gap-2 rounded-lg border border-dashed border-line px-3 py-2.5">
        <span className="text-[10px] leading-relaxed text-faint">
          Chapter weights shown here are <b>derived</b> from sample &amp; past papers (synthetic in
          this build). Official unit weightage is tracked separately and never mixed in.
        </span>
      </div>
      <div className="h-6" />
    </main>
  );
}
