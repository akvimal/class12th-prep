import { notFound } from 'next/navigation';
import { uiContext } from '@/app-services/app-context';
import { getChapterView } from '@/app-services/chapter-view';
import { updateChapterAction } from '@/app/actions';
import {
  CHAPTER_STATES,
  CONFIDENCE_LEVELS,
  SCHOOL_CHAPTER_STATUSES,
} from '@/domain/progress/chapter-progress';
import { GhostButton, PageHeader, PrimaryButton, SectionLabel, StatTile } from '@/components/ui';
import { formatDate, titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const WEIGHTS = {
  conceptScore: 20,
  practiceScore: 25,
  testScore: 30,
  recallScore: 15,
  revisionScore: 10,
} as const;

const COMPONENTS: { key: keyof typeof WEIGHTS; label: string }[] = [
  { key: 'conceptScore', label: 'Concept' },
  { key: 'practiceScore', label: 'Practice' },
  { key: 'testScore', label: 'Test' },
  { key: 'recallScore', label: 'Recall' },
  { key: 'revisionScore', label: 'Revision' },
];

const VISIBLE_STATES = CHAPTER_STATES.filter((s) => s !== 'NOT_STARTED');

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ subjectKey: string; chapterKey: string }>;
}) {
  const { subjectKey, chapterKey } = await params;
  const { repos, academicYearId } = await uiContext();
  const view = await getChapterView(repos, academicYearId, subjectKey, chapterKey);
  if (!view) notFound();

  const { progress, readiness } = view;
  const effective = readiness
    ? Math.round(readiness.readiness)
    : (progress.effectiveReadiness ?? 0);
  const stateIndex = VISIBLE_STATES.indexOf(progress.state as (typeof VISIBLE_STATES)[number]);

  return (
    <main>
      <PageHeader
        back={`/subjects/${view.subjectKey}`}
        eyebrow={`${view.subjectName.toUpperCase()} · ${view.unitName}`}
        title={view.chapterName}
      />

      {/* state track */}
      <div className="px-5 pt-4">
        <div className="flex items-center">
          {VISIBLE_STATES.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <span
                className={`h-2 w-2 rounded-full ${
                  i === stateIndex
                    ? 'h-2.5 w-2.5 bg-ink outline outline-[3px] outline-line-soft'
                    : i < stateIndex
                      ? 'bg-ink'
                      : 'bg-line'
                }`}
              />
              {i < VISIBLE_STATES.length - 1 && (
                <span className={`h-0.5 flex-1 ${i < stateIndex ? 'bg-ink' : 'bg-line'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-medium text-faint">
          {VISIBLE_STATES.map((s) => (
            <span key={s} className={s === progress.state ? 'text-ink' : ''}>
              {titleCase(s)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3.5 px-5 pt-6">
        <div className="font-mono text-[44px] font-medium leading-none text-warn">{effective}</div>
        <p className="pb-1.5 text-[12px] leading-relaxed text-muted">
          effective readiness / 100
          {readiness && (
            <>
              <br />
              raw {Math.round(readiness.raw)} × recency {readiness.recencyFactor.toFixed(2)}
            </>
          )}
        </p>
      </div>

      <SectionLabel className="px-5 pb-1 pt-6">Readiness components</SectionLabel>
      <div className="flex flex-col gap-3 px-5">
        {COMPONENTS.map(({ key, label }) => {
          const v = progress[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-[70px] shrink-0 text-[12px] font-medium text-ink">{label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                <span
                  className={`block h-full rounded-full ${v < 40 ? 'bg-bad' : 'bg-ink'}`}
                  style={{ width: `${v}%` }}
                />
              </span>
              <span className="w-[54px] shrink-0 text-right font-mono text-[11px] text-muted">
                {v} ·{WEIGHTS[key]}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="px-5 pt-2.5 text-[10px] leading-relaxed text-faint">
        Weights from config{' '}
        <span className="font-mono">{readiness?.algorithmVersion ?? 'readiness-v1'}</span>. Practice
        and a timed retest move this most.
      </p>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-6">
        <StatTile label="School status" value={titleCase(progress.schoolStatus)} />
        <StatTile
          label="Confidence"
          value={progress.confidence ? titleCase(progress.confidence) : '—'}
        />
        <StatTile
          label="Board weight"
          value={
            view.weights[0]
              ? `~${view.weights[0].value} · ${view.weights[0].sourceType === 'OFFICIAL' ? 'official' : 'derived'}`
              : '—'
          }
        />
        <StatTile
          label="Last revised"
          value={progress.lastRevisedAt ? formatDate(progress.lastRevisedAt.slice(0, 10)) : 'never'}
        />
      </div>

      {view.recentSessions.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1 pt-6">Recent activity</SectionLabel>
          <div className="px-5">
            {view.recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex justify-between border-b border-line-soft py-2.5 last:border-0"
              >
                <span className="text-[12px] font-medium text-ink">
                  {titleCase(s.type)} · {s.actualMinutes} min
                  {s.attempted != null && ` · ${s.correct ?? 0}/${s.attempted} correct`}
                </span>
                <span className="font-mono text-[11px] text-faint">
                  {formatDate(s.sessionDate)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {view.readinessHistory.length > 1 && (
        <>
          <SectionLabel className="px-5 pb-1 pt-6">Readiness history</SectionLabel>
          <div className="flex items-end gap-1.5 px-5">
            {view.readinessHistory.map((s) => (
              <div key={s.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-ink/80"
                  style={{ height: `${Math.max(3, Math.round(s.readiness * 0.6))}px` }}
                  title={`${formatDate(s.calculatedFor)}: ${Math.round(s.readiness)}`}
                />
                <span className="font-mono text-[8px] text-faint">{s.calculatedFor.slice(5)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {view.questionErrors.length > 0 && (
        <>
          <SectionLabel className="px-5 pb-1 pt-6">
            Errors from tests · {view.questionErrors.length}
          </SectionLabel>
          <div className="px-5">
            {view.questionErrors.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between border-b border-line-soft py-2.5 last:border-0"
              >
                <span className="text-[12px] font-medium text-ink">
                  {titleCase(e.errorType)}{' '}
                  <span className="font-normal text-faint">· {titleCase(e.state)}</span>
                </span>
                <span className="font-mono text-[11px] text-bad">−{e.marksLost}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2.5 px-5 pt-6">
        <PrimaryButton
          href={`/session?chapter=${view.chapterKey}&subject=${view.subjectKey}&type=PRACTISE`}
          className="flex-1"
        >
          Log study
        </PrimaryButton>
        <GhostButton href="/today">Back to Today</GhostButton>
      </div>

      <details className="mx-5 mt-4 rounded-2xl border border-line">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-ink">
          Update my ratings
          <span className="ml-1 font-normal text-faint">— after a test or a study block</span>
        </summary>
        <form
          action={updateChapterAction}
          className="flex flex-col gap-4 border-t border-line px-4 py-4"
        >
          <input type="hidden" name="subjectKey" value={view.subjectKey} />
          <input type="hidden" name="chapterKey" value={view.chapterKey} />

          <label className="flex flex-col gap-1.5">
            <SectionLabel>School status</SectionLabel>
            <select
              name="schoolStatus"
              defaultValue={progress.schoolStatus}
              className="h-10 rounded-lg border border-line bg-card px-2 text-[13px]"
            >
              {SCHOOL_CHAPTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionLabel>Chapter stage</SectionLabel>
            <select
              name="state"
              defaultValue={progress.state}
              className="h-10 rounded-lg border border-line bg-card px-2 text-[13px]"
            >
              {CHAPTER_STATES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <SectionLabel>Confidence</SectionLabel>
            <select
              name="confidence"
              defaultValue={progress.confidence ?? ''}
              className="h-10 rounded-lg border border-line bg-card px-2 text-[13px]"
            >
              <option value="">—</option>
              {CONFIDENCE_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2.5">
            <SectionLabel>Component scores (0–100)</SectionLabel>
            {COMPONENTS.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-ink">{label}</span>
                <input
                  type="number"
                  name={key}
                  min={0}
                  max={100}
                  defaultValue={progress[key]}
                  className="h-9 w-20 rounded-lg border border-line bg-card px-2 text-right font-mono text-[13px]"
                />
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-ink text-[13px] font-semibold text-paper"
          >
            Save &amp; recompute readiness
          </button>
          <p className="text-[10px] leading-relaxed text-faint">
            Objective test and recall scores drive readiness; confidence is context for planning
            only.
          </p>
        </form>
      </details>
      <div className="h-6" />
    </main>
  );
}
