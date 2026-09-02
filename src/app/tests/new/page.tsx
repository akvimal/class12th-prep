import { PageHeader, Card, PrimaryButton, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const FIELD = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[14px] text-ink';

export default function NewTestPage() {
  return (
    <main>
      <PageHeader eyebrow="Tests" title="Add a test" back="/tests" />

      <form className="flex flex-col gap-4 px-5" aria-label="Add test">
        <label className="flex flex-col gap-1.5">
          <SectionLabel>Subject</SectionLabel>
          <select className={FIELD} defaultValue="PHY">
            <option value="PHY">Physics</option>
            <option value="CHE">Chemistry</option>
            <option value="MAT">Mathematics</option>
            <option value="CS">Computer Science</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <SectionLabel>Type</SectionLabel>
          <select className={FIELD} defaultValue="SCHOOL_UNIT_TEST">
            <option value="SCHOOL_CLASS_TEST">Class test</option>
            <option value="SCHOOL_UNIT_TEST">Unit test</option>
            <option value="SCHOOL_HALF_YEARLY">Half‑yearly</option>
            <option value="SCHOOL_PREBOARD">Pre‑board</option>
          </select>
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <SectionLabel>Date</SectionLabel>
            <input type="date" className={FIELD} defaultValue="2026-09-18" />
          </label>
          <label className="flex w-28 flex-col gap-1.5">
            <SectionLabel>Max marks</SectionLabel>
            <input type="number" className={FIELD} defaultValue={30} />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Chapters covered</SectionLabel>
          <Card className="flex flex-col gap-2">
            {['Electrostatics', 'Current Electricity', 'Ray Optics'].map((c, i) => (
              <label key={c} className="flex items-center gap-2.5 text-[13px] text-ink">
                <input type="checkbox" defaultChecked={i < 2} className="h-4 w-4 accent-accent" />
                {c}
              </label>
            ))}
          </Card>
          <p className="text-[11px] leading-relaxed text-faint">
            These chapters get a readiness check scheduled two days before the test.
          </p>
        </div>

        <PrimaryButton className="mt-1">Save test</PrimaryButton>
      </form>
      <div className="h-6" />
    </main>
  );
}
