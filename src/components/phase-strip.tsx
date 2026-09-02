import type { PhaseType } from '@/domain/planning/plan';
import type { PhaseSpec } from '@/domain/planning/plan-phases';

const SHORT: Record<PhaseType, string> = {
  FOUNDATION: 'Foundation',
  SYLLABUS_COVERAGE: 'Coverage',
  CONSOLIDATION: 'Consolidate',
  REVISION: 'Revision',
  PREBOARD: 'Pre‑board',
  BOARD_EXAM: 'Board',
};

export function PhaseStrip({
  phases,
  current,
}: {
  phases: PhaseSpec[];
  current: PhaseType | null;
}) {
  if (phases.length === 0) return null;
  const currentIndex = phases.findIndex((p) => p.phaseType === current);

  return (
    <div className="rounded-xl bg-sink px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
          Current phase
        </span>
        <span className="text-[12px] font-semibold text-ink">{current ? SHORT[current] : '—'}</span>
      </div>
      <div className="mt-2.5 flex items-center">
        {phases.map((phase, i) => {
          const done = currentIndex >= 0 && i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={phase.phaseType} className="flex flex-1 items-center last:flex-none">
              <span
                className={`h-2 w-2 rounded-full ${
                  active ? 'h-2.5 w-2.5 bg-ink ring-2 ring-line' : done ? 'bg-ink' : 'bg-line'
                }`}
              />
              {i < phases.length - 1 && (
                <span className={`h-0.5 flex-1 ${done ? 'bg-ink' : 'bg-line'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between">
        {phases.map((phase) => (
          <span key={phase.phaseType} className="text-[9px] font-medium text-faint">
            {SHORT[phase.phaseType]}
          </span>
        ))}
      </div>
    </div>
  );
}
