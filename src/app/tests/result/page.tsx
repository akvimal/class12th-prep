import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { listUpcomingAssessments } from '@/app-services/assessment';
import { getCurriculumProgress } from '@/app-services/progress';
import { recordResultAction } from '@/app/actions';
import { PageHeader, Card, SectionLabel } from '@/components/ui';
import { ERROR_TYPES } from '@/domain/errors/errors';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FIELD = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[14px] text-ink';

export default async function TestResultPage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const { repos, academicYearId, asOf } = await uiContext();
  const assessmentId = (await searchParams).assessment;

  const upcoming = await listUpcomingAssessments(repos, academicYearId, asOf);
  const assessment = upcoming.find((a) => a.id === assessmentId) ?? upcoming[0];

  if (!assessment) {
    return (
      <main>
        <PageHeader eyebrow="After the test" title="Enter a result" back="/tests" />
        <p className="px-5 text-[13px] text-muted">
          No test to record.{' '}
          <Link href="/tests/new" className="text-accent">
            Add one
          </Link>{' '}
          first, then come back after it&apos;s written.
        </p>
      </main>
    );
  }

  const tree = await getCurriculumProgress(repos, academicYearId);
  const chapterKeyByName = new Map(assessment.chapters.map((c) => [c.name, c.name]));
  const chapters = (tree?.subjects ?? [])
    .flatMap((s) => s.units.flatMap((u) => u.chapters))
    .filter((c) => chapterKeyByName.has(c.name))
    .map((c) => ({ key: c.key, name: c.name }));

  return (
    <main>
      <PageHeader
        eyebrow={`${assessment.subjectName} · ${formatDate(assessment.examDate)}`}
        title={assessment.name}
        back="/tests"
      />

      <form
        action={recordResultAction}
        className="flex flex-col gap-4 px-5"
        aria-label="Enter test result"
      >
        <input type="hidden" name="assessmentId" value={assessment.id} />

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <SectionLabel>Score</SectionLabel>
            <input
              type="number"
              name="score"
              min={0}
              max={assessment.maxMarks ?? undefined}
              className={FIELD}
              required
            />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <SectionLabel>Out of</SectionLabel>
            <input
              type="number"
              className={FIELD}
              value={assessment.maxMarks ?? ''}
              readOnly
              aria-readonly
            />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <SectionLabel>Minutes</SectionLabel>
            <input
              type="number"
              name="timeTakenMinutes"
              min={0}
              className={FIELD}
              placeholder="—"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Where did the marks go?</SectionLabel>
          <p className="text-[11px] leading-relaxed text-faint">
            For each chapter that lost marks, enter how many and the main reason. Leave the rest at
            0.
          </p>
          <Card className="flex flex-col gap-4">
            {chapters.map((c) => (
              <div key={c.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink">{c.name}</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted">
                    marks lost
                    <input
                      type="number"
                      name={`error.${c.key}.marks`}
                      min={0}
                      defaultValue={0}
                      className="h-8 w-16 rounded-lg border border-line bg-card px-2 text-right font-mono text-[13px]"
                    />
                  </label>
                </div>
                <select
                  name={`error.${c.key}.type`}
                  defaultValue="CONCEPT"
                  className="h-9 rounded-lg border border-line bg-card px-2 text-[12px] text-muted"
                >
                  {ERROR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </Card>
        </div>

        <button
          type="submit"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
        >
          Save result
        </button>
        <p className="text-[11px] leading-relaxed text-faint">
          The test is marked done and each tagged error is logged (NEW). Review &amp; retest
          tracking is on the Tests tab.
        </p>
      </form>
      <div className="h-6" />
    </main>
  );
}
