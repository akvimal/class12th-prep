import { SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function WelcomePage() {
  return (
    <main className="px-5 py-8">
      <SectionLabel>Setup needed</SectionLabel>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-tight text-ink">
        No student profile yet
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        A database is connected but nothing is in it. Create the profile once, from the server:
      </p>

      <ol className="mt-5 flex flex-col gap-4">
        <li className="flex gap-3">
          <span className="font-mono text-[12px] font-semibold text-faint">1</span>
          <div className="text-[13px] leading-relaxed text-ink">
            Copy{' '}
            <code className="rounded bg-sink px-1 font-mono text-[12px]">
              config/student.example.json
            </code>{' '}
            to{' '}
            <code className="rounded bg-sink px-1 font-mono text-[12px]">config/student.json</code>{' '}
            and edit the name, dates and subjects.
          </div>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[12px] font-semibold text-faint">2</span>
          <div className="text-[13px] leading-relaxed text-ink">
            Run <code className="rounded bg-sink px-1 font-mono text-[12px]">pnpm db:migrate</code>{' '}
            then <code className="rounded bg-sink px-1 font-mono text-[12px]">pnpm prep:init</code>.
          </div>
        </li>
        <li className="flex gap-3">
          <span className="font-mono text-[12px] font-semibold text-faint">3</span>
          <div className="text-[13px] leading-relaxed text-ink">Reload this page.</div>
        </li>
      </ol>

      <p className="mt-6 rounded-lg border border-dashed border-line px-3 py-2 font-mono text-[10px] leading-relaxed text-faint">
        The curriculum imported by <span className="font-semibold">prep:init</span> is derived /
        unofficial — chapter lists still need a check against the school syllabus.
      </p>
    </main>
  );
}
