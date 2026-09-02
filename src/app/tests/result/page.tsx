import { PageHeader, Card, Chip, PrimaryButton, SectionLabel } from '@/components/ui';

export const dynamic = 'force-dynamic';

const FIELD = 'h-11 w-full rounded-xl border border-line bg-card px-3 text-[14px] text-ink';

const ERROR_TYPES = [
  'Concept gap',
  'Calculation',
  'Misread question',
  'Ran out of time',
  'Silly slip',
];

export default function TestResultPage() {
  return (
    <main>
      <PageHeader eyebrow="Physics Unit Test · 7 Sep" title="After the test" back="/tests" />

      <form className="flex flex-col gap-4 px-5" aria-label="Enter test result">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <SectionLabel>Score</SectionLabel>
            <input type="number" className={FIELD} defaultValue={19} />
          </label>
          <label className="flex w-28 flex-col gap-1.5">
            <SectionLabel>Out of</SectionLabel>
            <input type="number" className={FIELD} defaultValue={30} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Where did the marks go?</SectionLabel>
          <Card className="flex flex-col gap-3">
            {[
              ['Electrostatics', 4],
              ['Current Electricity', 7],
            ].map(([chapter, lost]) => (
              <div key={chapter as string} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px] font-semibold text-ink">
                  <span>{chapter}</span>
                  <span className="font-mono text-bad">−{lost} marks</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ERROR_TYPES.map((e) => (
                    <Chip key={e} dashed>
                      {e}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-line border-l-[3px] border-l-warn px-3.5 py-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Current Electricity lost the most marks to concept gaps. We&apos;ll drop its readiness
            and add two focused sessions this week before it compounds.
          </p>
        </div>

        <PrimaryButton className="mt-1">Save &amp; update readiness</PrimaryButton>
      </form>
      <div className="h-6" />
    </main>
  );
}
