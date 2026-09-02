import Link from 'next/link';
import { DEMO_DATE, demo } from '@/app-services/demo';
import { getStudentOverview } from '@/app-services/overview';
import { Bar, Card, Chip, SectionLabel } from '@/components/ui';
import { ChevronRight } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function SubjectsPage() {
  const { repos, academicYearId, planId } = await demo();
  const overview = await getStudentOverview(repos, academicYearId, planId, DEMO_DATE);
  if (!overview) return <p className="p-5 text-sm text-muted">No data.</p>;

  return (
    <main>
      <header className="px-5 pb-3.5 pt-5">
        <SectionLabel>CBSE XII · 2026–27</SectionLabel>
        <h1 className="mt-1 font-display text-[30px] font-bold leading-tight text-ink">Subjects</h1>
      </header>

      <div className="flex flex-col gap-3 px-5">
        {overview.subjects.map((s) => (
          <Card key={s.key} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-[17px] font-bold leading-none text-ink">
                  {s.name}
                </div>
                <div className="mt-1 text-[11px] text-faint">
                  {s.code ? `Code ${s.code} · ` : ''}
                  {s.chapters.length} chapters
                </div>
              </div>
              <div className="font-mono text-[22px] font-medium leading-none text-ink">
                {s.readiness}
                <span className="text-[12px] text-faint">%</span>
              </div>
            </div>
            <Bar value={s.readiness} />
            <div className="flex flex-wrap gap-1.5">
              {s.counts.examReady > 0 && <Chip tone="ok">{s.counts.examReady} exam‑ready</Chip>}
              {s.counts.inProgress > 0 && <Chip>{s.counts.inProgress} in progress</Chip>}
              {s.counts.notStarted > 0 && (
                <Chip tone="warn">{s.counts.notStarted} not started</Chip>
              )}
            </div>
            <Link
              href={`/subjects/${s.key}`}
              className="flex items-center justify-between border-t border-line-soft pt-3 text-[12px] font-semibold text-ink"
            >
              Open chapters
              <ChevronRight size={13} className="text-faint" />
            </Link>
          </Card>
        ))}
      </div>

      <div className="h-6" />
    </main>
  );
}
