import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { syntheticSeedSpec } from '@/persistence/seed/spec';
import { daysBetween } from '@/domain/planning/dates';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { PlusIcon } from '@/components/icons';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TestsPage() {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  const subjectName = new Map(overview.subjects.map((s) => [s.key, s.name]));
  const chapterName = new Map(
    overview.subjects.flatMap((s) => s.chapters.map((c) => [c.key, c.name] as const)),
  );

  const upcoming = syntheticSeedSpec.assessments
    .map((a) => ({ ...a, days: daysBetween(asOf, a.date) }))
    .sort((a, b) => a.days - b.days);

  return (
    <main>
      <header className="flex items-start justify-between px-5 pb-3.5 pt-5">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight text-ink">Tests</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            School tests feed board readiness.
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
      <div className="flex flex-col gap-2.5 px-5">
        {upcoming.map((a) => (
          <Card key={a.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {subjectName.get(a.subjectKey) ?? a.subjectKey} ·{' '}
                {titleCase(a.type.replace('SCHOOL_', ''))}
              </span>
              <span className="font-mono text-[12px] font-semibold text-warn">
                in {a.days} days
              </span>
            </div>
            <div className="font-display text-[16px] font-bold leading-tight text-ink">
              {formatDate(a.date)} · {a.maxMarks} marks
            </div>
            <div className="text-[11px] leading-relaxed text-muted">
              {a.chapterKeys.map((k) => chapterName.get(k) ?? k).join(', ')}
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

      <SectionLabel className="px-5 pb-2 pt-6">Recorded</SectionLabel>
      <div className="px-5">
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Physics · Half‑yearly
            </span>
            <span className="font-mono text-[15px] font-medium">
              22<span className="text-faint">/30</span>
            </span>
          </div>
          <div className="text-[11px] leading-relaxed text-muted">
            16 Aug · 3 errors logged · 1 retest due
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip>Calculation ×2</Chip>
            <Chip>Concept ×1</Chip>
            <Chip tone="bad">Current Electricity readiness ↓</Chip>
          </div>
        </Card>
      </div>
      <div className="h-6" />
    </main>
  );
}
