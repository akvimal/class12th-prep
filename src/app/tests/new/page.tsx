import { uiContext } from '@/app-services/app-context';
import { getCurriculumProgress } from '@/app-services/progress';
import { addAssessmentAction } from '@/app/actions';
import { PageHeader, Card, SectionLabel } from '@/components/ui';
import { ASSESSMENT_TYPES } from '@/domain/assessment/assessment';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FIELD = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[14px] text-ink';

export default async function NewTestPage() {
  const { repos, academicYearId } = await uiContext();
  const tree = await getCurriculumProgress(repos, academicYearId);
  const subjects = (tree?.subjects ?? []).map((s) => ({
    key: s.key,
    name: s.name,
    chapters: s.units.flatMap((u) => u.chapters.map((c) => ({ key: c.key, name: c.name }))),
  }));

  return (
    <main>
      <PageHeader eyebrow="Tests" title="Add a test" back="/tests" />

      <form action={addAssessmentAction} className="flex flex-col gap-4 px-5" aria-label="Add test">
        <label className="flex flex-col gap-1.5">
          <SectionLabel>Subject</SectionLabel>
          <select
            name="subjectKey"
            className={FIELD}
            defaultValue={subjects[0]?.key ?? ''}
            required
          >
            {subjects.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <SectionLabel>Type</SectionLabel>
            <select name="type" className={FIELD} defaultValue="SCHOOL_UNIT_TEST">
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t.replace('SCHOOL_', ''))}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-28 flex-col gap-1.5">
            <SectionLabel>Max marks</SectionLabel>
            <input type="number" name="maxMarks" min={1} className={FIELD} placeholder="—" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <SectionLabel>Name</SectionLabel>
          <input
            type="text"
            name="name"
            className={FIELD}
            placeholder="e.g. Physics unit test"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <SectionLabel>Date</SectionLabel>
          <input type="date" name="examDate" className={FIELD} required />
        </label>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Chapters covered</SectionLabel>
          <p className="text-[11px] leading-relaxed text-faint">
            Tick chapters in the subject you chose above.
          </p>
          <Card className="flex flex-col gap-4">
            {subjects.map((s) => (
              <div key={s.key} className="flex flex-col gap-2">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
                  {s.name}
                </div>
                {s.chapters.map((c) => (
                  <label key={c.key} className="flex items-center gap-2.5 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      name="chapterKeys"
                      value={c.key}
                      className="h-4 w-4 accent-accent"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <button
          type="submit"
          className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
        >
          Save test
        </button>
      </form>
      <div className="h-6" />
    </main>
  );
}
