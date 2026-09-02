import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getCurriculumProgress } from '@/app-services/progress';
import { logStudyAction } from '@/app/actions';
import { PageHeader, SectionLabel } from '@/components/ui';
import { STUDY_SESSION_TYPES } from '@/domain/progress/study-session';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FIELD = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[14px] text-ink';
const RADIO =
  'flex-1 cursor-pointer rounded-lg border border-line py-2.5 text-center text-[12px] font-semibold text-muted has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; subject?: string; type?: string; minutes?: string }>;
}) {
  const sp = await searchParams;
  const { repos, academicYearId } = await uiContext();
  const tree = await getCurriculumProgress(repos, academicYearId);

  const chapters = (tree?.subjects ?? []).flatMap((s) =>
    s.units.flatMap((u) =>
      u.chapters.map((c) => ({ key: c.key, name: c.name, subjectKey: s.key })),
    ),
  );
  const selected = chapters.find((c) => c.key === sp.chapter);
  const subjectKey = selected?.subjectKey ?? sp.subject ?? '';

  return (
    <main>
      <PageHeader
        eyebrow="Log study"
        title="What did you do?"
        back={selected ? `/subjects/${selected.subjectKey}/${selected.key}` : '/today'}
      />

      <form action={logStudyAction} className="flex flex-col gap-5 px-5">
        <input type="hidden" name="subjectKey" value={subjectKey} />

        <label className="flex flex-col gap-1.5">
          <SectionLabel>Chapter</SectionLabel>
          <select name="chapterKey" className={FIELD} defaultValue={selected?.key ?? ''} required>
            <option value="" disabled>
              Choose a chapter…
            </option>
            {chapters.map((c) => (
              <option key={c.key} value={c.key}>
                {c.subjectKey} · {c.name}
              </option>
            ))}
          </select>
          {selected && (
            <p className="text-[11px] text-faint">
              {selected.subjectKey} · {selected.name}
            </p>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <SectionLabel>Activity</SectionLabel>
          <select name="type" className={FIELD} defaultValue={sp.type ?? 'PRACTISE'}>
            {STUDY_SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <SectionLabel>How did it go?</SectionLabel>
          <div className="flex gap-2">
            {[
              ['YES', 'Full'],
              ['PARTIAL', 'Partial'],
              ['NO', 'Skipped'],
            ].map(([value, label], i) => (
              <label key={value} className={RADIO}>
                <input
                  type="radio"
                  name="completion"
                  value={value}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <SectionLabel>Minutes</SectionLabel>
            <input
              type="number"
              name="actualMinutes"
              min={0}
              max={600}
              defaultValue={sp.minutes ?? 30}
              className={FIELD}
              required
            />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <SectionLabel>Attempted</SectionLabel>
            <input type="number" name="attempted" min={0} className={FIELD} />
          </label>
          <label className="flex w-24 flex-col gap-1.5">
            <SectionLabel>Correct</SectionLabel>
            <input type="number" name="correct" min={0} className={FIELD} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>
            Confidence now <span className="text-line">(optional)</span>
          </SectionLabel>
          <div className="flex gap-2">
            {['WEAK', 'MODERATE', 'STRONG'].map((c) => (
              <label key={c} className={RADIO}>
                <input type="radio" name="confidenceAfter" value={c} className="sr-only" />
                {titleCase(c)}
              </label>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-faint">
            Confidence guides planning. Test &amp; recall evidence carries more weight in readiness
            — update your ratings on the chapter page after a real test.
          </p>
        </div>

        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
        >
          Save session
        </button>
        <p className="text-[11px] leading-relaxed text-faint">
          Saved as evidence. A partial or skipped session never marks a chapter finished on its own.{' '}
          <Link href="/today" className="text-accent">
            Back to Today
          </Link>
        </p>
      </form>
      <div className="h-6" />
    </main>
  );
}
