import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getStudyNow, STUDY_NOW_MINUTE_OPTIONS } from '@/app-services/study-now';
import { InfoIcon, PlayIcon } from '@/components/icons';
import { Chip, PageHeader, SectionLabel } from '@/components/ui';
import { titleCase } from '@/lib/format';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  LOW_READINESS: 'Below readiness floor',
  SCHOOL_TEST_SOON: 'School test soon',
  REVISION_DUE: 'Revision due',
  HIGH_BOARD_WEIGHT: 'High board weight',
  BACKLOG: 'Carried over',
};

export default async function StudyNowPage({
  searchParams,
}: {
  searchParams: Promise<{ mins?: string }>;
}) {
  const { repos, academicYearId, asOf } = await uiContext();
  const requested = Number((await searchParams).mins);
  const minutes = STUDY_NOW_MINUTE_OPTIONS.includes(requested) ? requested : 45;

  const result = await getStudyNow(repos, academicYearId, asOf, minutes);
  const task = result?.task ?? null;

  return (
    <main>
      <PageHeader back="/today" title="Study Now" />
      <p className="px-5 text-[13px] leading-relaxed text-muted">
        One task, chosen for the time you have.
      </p>

      <SectionLabel className="px-5 pb-2 pt-6">How long do you have?</SectionLabel>
      <div className="flex gap-2 px-5">
        {STUDY_NOW_MINUTE_OPTIONS.map((m) => (
          <Link
            key={m}
            href={m === 45 ? '/study-now' : `/study-now?mins=${m}`}
            className={`flex-1 rounded-lg py-2.5 text-center text-[13px] font-semibold ${
              m === minutes
                ? 'border-[1.5px] border-ink bg-ink text-paper'
                : 'border border-line text-muted'
            }`}
          >
            {m}
          </Link>
        ))}
      </div>
      <p className="px-5 pt-1.5 text-[11px] text-faint">minutes</p>

      {task ? (
        <>
          <SectionLabel className="px-5 pb-2 pt-6">Recommended</SectionLabel>
          <div className="mx-5 flex flex-col gap-3 rounded-2xl border-[1.5px] border-ink p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                {task.candidate.subjectName} · {titleCase(task.candidate.activity)}
              </span>
              <span className="font-mono text-[11px] text-muted">{task.minutes} min</span>
            </div>
            <div className="font-display text-[21px] font-bold leading-tight text-ink">
              {task.candidate.chapterName}
            </div>

            <div className="flex flex-col gap-2">
              {result!.microPlan.map((step) => (
                <div key={step.fromMinute} className="flex gap-2.5">
                  <span className="w-[46px] shrink-0 font-mono text-[11px] text-faint">
                    {step.fromMinute}–{step.toMinute}
                  </span>
                  <span className="text-[12px] leading-snug text-muted">{step.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-line-soft pt-2.5">
              <SectionLabel>Why this?</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip>Readiness {task.candidate.priority.effectiveReadiness}/100</Chip>
                {task.reasons.map((r) => (
                  <Chip key={r} tone="accent">
                    {REASON_LABEL[r] ?? r}
                  </Chip>
                ))}
                <Chip>Fits {minutes} min</Chip>
              </div>
            </div>

            <Link
              href={`/session?chapter=${task.candidate.chapterKey}&subject=${task.candidate.subjectKey}&type=${task.candidate.activity}&minutes=${task.minutes}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
            >
              <PlayIcon size={15} /> Start this task
            </Link>
          </div>
        </>
      ) : (
        <p className="px-5 pt-8 text-[13px] text-muted">
          Nothing needs {minutes} minutes right now — every in-play chapter is above the floor, or
          the time is too short. Pick a chapter from{' '}
          <Link href="/subjects" className="text-accent">
            Subjects
          </Link>
          .
        </p>
      )}

      <p className="flex items-start gap-2 px-5 pt-4 text-[11px] leading-relaxed text-faint">
        <InfoIcon size={13} className="mt-0.5 shrink-0" />
        The same plan, time and progress always produce this recommendation — config{' '}
        <span className="font-semibold">{result?.algorithmVersion ?? 'planner-v1'}</span>.
      </p>
      <div className="h-6" />
    </main>
  );
}
