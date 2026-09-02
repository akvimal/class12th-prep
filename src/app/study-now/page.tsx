import Link from 'next/link';
import { uiContext } from '@/app-services/app-context';
import { getStudentOverview } from '@/app-services/overview';
import { InfoIcon, PlayIcon } from '@/components/icons';
import { Chip, PageHeader, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const MINUTES = 45;

export default async function StudyNowPage() {
  const { repos, academicYearId, planId, asOf } = await uiContext();
  const overview = await getStudentOverview(repos, academicYearId, planId, asOf);
  const pick = overview?.needsAttention[0];

  const micro = pick
    ? [
        ['0–10', `Recall the key ideas of ${pick.chapterName} from memory, then check`],
        ['10–38', `${MINUTES - 17} min of board-style problems on the weak areas`],
        ['38–45', 'Mark errors by type and log the outcome'],
      ]
    : [];

  return (
    <main>
      <PageHeader back="/today" title="Study Now" />
      <p className="px-5 text-[13px] leading-relaxed text-muted">
        One task, chosen for the time you have.
      </p>

      <SectionLabel className="px-5 pb-2 pt-6">How long do you have?</SectionLabel>
      <div className="flex gap-2 px-5">
        {[20, 30, 45, 60, 90].map((m) => (
          <span
            key={m}
            className={`flex-1 rounded-lg py-2.5 text-center text-[13px] font-semibold ${
              m === MINUTES
                ? 'border-[1.5px] border-ink bg-ink text-paper'
                : 'border border-line text-muted'
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <p className="px-5 pt-1.5 text-[11px] text-faint">minutes</p>

      {pick ? (
        <>
          <SectionLabel className="px-5 pb-2 pt-6">Recommended</SectionLabel>
          <div className="mx-5 flex flex-col gap-3 rounded-2xl border-[1.5px] border-ink p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                {pick.subjectName} · Practise
              </span>
              <span className="font-mono text-[11px] text-muted">{MINUTES} min</span>
            </div>
            <div className="font-display text-[21px] font-bold leading-tight text-ink">
              {pick.chapterName}
            </div>

            <div className="flex flex-col gap-2">
              {micro.map(([time, text]) => (
                <div key={time} className="flex gap-2.5">
                  <span className="w-[42px] shrink-0 font-mono text-[11px] text-faint">{time}</span>
                  <span className="text-[12px] leading-snug text-muted">{text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-line-soft pt-2.5">
              <SectionLabel>Why this?</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip>Readiness {pick.readiness}/100</Chip>
                {pick.reasons.map((r) => (
                  <Chip key={r} tone="accent">
                    {r}
                  </Chip>
                ))}
                <Chip>Fits {MINUTES} min</Chip>
              </div>
            </div>

            <Link
              href={`/session?chapter=${pick.chapterKey}&subject=${pick.subjectKey}&type=PRACTISE&minutes=${MINUTES}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink"
            >
              <PlayIcon size={15} /> Start this task
            </Link>
          </div>
        </>
      ) : (
        <p className="px-5 pt-8 text-[13px] text-muted">
          Nothing below the readiness floor right now — pick any chapter from{' '}
          <Link href="/subjects" className="text-accent">
            Subjects
          </Link>
          .
        </p>
      )}

      <p className="flex items-start gap-2 px-5 pt-4 text-[11px] leading-relaxed text-faint">
        <InfoIcon size={13} className="mt-0.5 shrink-0" />
        The same plan, time and progress always produce the same recommendation. No hidden ranking.
      </p>
      <div className="h-6" />
    </main>
  );
}
