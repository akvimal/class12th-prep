import Link from 'next/link';
import type { TrajectoryRisk } from '@/domain/planning/trajectory-risk';

const TITLE: Record<string, string> = {
  PLAN_AT_RISK: 'Behind the plan line',
  SYLLABUS_TARGET_AT_RISK: 'Syllabus target at risk',
};

/**
 * A compact plan-risk banner for the dashboard and Today. Shows the most severe
 * risk only; links to course correction. Renders nothing when there is no risk.
 */
export function RiskBanner({ risks }: { risks: TrajectoryRisk[] }) {
  if (risks.length === 0) return null;
  const worst =
    risks.find((r) => r.severity === 'AT_RISK') ??
    risks.find((r) => r.type === 'SYLLABUS_TARGET_AT_RISK') ??
    risks[0]!;
  const atRisk = worst.severity === 'AT_RISK';

  return (
    <Link
      href="/course-correction"
      className={`mx-5 mt-3 flex flex-col gap-1 rounded-xl border border-l-[3px] px-3.5 py-3 ${
        atRisk ? 'border-line border-l-bad' : 'border-line border-l-warn'
      }`}
    >
      <span className={`text-[12px] font-semibold ${atRisk ? 'text-bad' : 'text-warn'}`}>
        {TITLE[worst.type] ?? worst.type}
        {risks.length > 1 ? ` · +${risks.length - 1} more` : ''}
      </span>
      <span className="text-[11px] leading-relaxed text-muted">
        {worst.drivers[0]} — see course corrections →
      </span>
    </Link>
  );
}
