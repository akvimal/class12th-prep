import { plannerV1, type PlannerConfig } from '@/config/planner';
import { priorityV1 } from '@/config/priority';
import { computePriority, prioritize, type PriorityInput } from './priority';

/**
 * Deterministic daily planner (docs/ALGORITHMS.md §3 guardrails, §5). Ranks
 * candidate study tasks by priority, then applies guardrails, and returns at
 * most `maxPrimaryTasks` primary cards plus a few optional ones. Same
 * candidates + config + date → same plan. The planner never creates tasks and
 * never silently exceeds real capacity.
 */

export type PlannerEnergy = 'LOW' | 'OK' | 'HIGH';
export type PlannerActivity = 'LEARN' | 'PRACTISE' | 'ACTIVE_RECALL' | 'REVISION' | 'PYQ';

export const REASON_CODES = [
  'LOW_READINESS',
  'SCHOOL_TEST_SOON',
  'REVISION_DUE',
  'HIGH_BOARD_WEIGHT',
  'BACKLOG',
  'REVISION_GUARD',
  'STARVATION_GUARD',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface PlannerCandidate {
  /** Stable identity (typically the chapter key). */
  id: string;
  subjectKey: string;
  subjectName: string;
  chapterKey: string;
  chapterName: string;
  activity: PlannerActivity;
  /** Minutes the task should take; 0 → the config default for the activity. */
  estimatedMinutes: number;
  prerequisitesMet: boolean;
  priority: PriorityInput;
}

export interface PlannedTask {
  candidate: PlannerCandidate;
  minutes: number;
  score: number;
  reasons: ReasonCode[];
}

export interface DailyPlan {
  asOf: string;
  energy: PlannerEnergy;
  /** Real available minutes for the day. */
  capacityMinutes: number;
  /** capacity × the energy factor — what the planner aims to fill. */
  targetMinutes: number;
  primary: PlannedTask[];
  optional: PlannedTask[];
  plannedMinutes: number;
  /** target − planned; negative when a forced task pushes the plan over target. */
  unfilledMinutes: number;
  algorithmVersion: string;
}

export interface DailyPlanInput {
  candidates: PlannerCandidate[];
  capacityMinutes: number;
  energy: PlannerEnergy;
  asOf: string;
}

function minutesFor(c: PlannerCandidate, config: PlannerConfig): number {
  return c.estimatedMinutes > 0
    ? c.estimatedMinutes
    : (config.defaultMinutesByActivity[c.activity] ?? config.minMeaningfulMinutes);
}

function reasonsFor(c: PlannerCandidate, forced: Set<string>): ReasonCode[] {
  const p = c.priority;
  const out: ReasonCode[] = [];
  if (p.effectiveReadiness < 55) out.push('LOW_READINESS');
  if (p.daysUntilSchoolTest != null && p.daysUntilSchoolTest >= 0 && p.daysUntilSchoolTest <= 7) {
    out.push('SCHOOL_TEST_SOON');
  }
  if (p.revisionDue !== 'NONE') out.push('REVISION_DUE');
  if ((p.boardWeight ?? 0) >= 8) out.push('HIGH_BOARD_WEIGHT');
  if (p.missedCount > 0) out.push('BACKLOG');
  if (forced.has(`revision:${c.id}`)) out.push('REVISION_GUARD');
  if (forced.has(`starve:${c.id}`)) out.push('STARVATION_GUARD');
  return out;
}

export function buildDailyPlan(
  input: DailyPlanInput,
  config: PlannerConfig = plannerV1,
): DailyPlan {
  const target = Math.round(input.capacityMinutes * config.energyCapacityFactor[input.energy]);

  // Guardrail 1 — prerequisite eligibility.
  const eligible = input.candidates.filter((c) => c.prerequisitesMet);

  const ranked = prioritize(
    eligible.map((candidate) => ({ candidate, input: candidate.priority })),
    priorityV1,
  );
  const order = new Map(ranked.map((r, i) => [r.candidate.id, i]));
  const scoreById = new Map(ranked.map((r) => [r.candidate.id, r.score]));

  // Forced-inclusion guardrails (5 school urgency, 4 revision starvation, 6 low-priority starvation).
  const forcedTags = new Set<string>();
  const forcedIds: string[] = [];
  const pushForced = (c: PlannerCandidate | undefined, tag: string) => {
    if (!c) return;
    forcedTags.add(`${tag}:${c.id}`);
    if (!forcedIds.includes(c.id)) forcedIds.push(c.id);
  };

  const byRank = [...eligible].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  pushForced(
    byRank.find(
      (c) =>
        c.priority.daysUntilSchoolTest != null &&
        c.priority.daysUntilSchoolTest >= 0 &&
        c.priority.daysUntilSchoolTest <= config.schoolTestForceWithinDays,
    ),
    'school',
  );
  if (config.guaranteeRevisionWhenDue) {
    pushForced(
      byRank.find((c) => c.priority.revisionDue !== 'NONE' && c.activity === 'REVISION'),
      'revision',
    );
  }
  for (const c of byRank) {
    if (c.priority.missedCount >= config.starvationMissedCount) pushForced(c, 'starve');
  }

  // Assemble primary: forced first (rank order, capped), then fill by rank.
  const primaryIds: string[] = [];
  const subjectCount = new Map<string, number>();
  const take = (c: PlannerCandidate): boolean => {
    if (primaryIds.length >= config.maxPrimaryTasks) return false;
    if (primaryIds.includes(c.id)) return false;
    const used = subjectCount.get(c.subjectKey) ?? 0;
    if (used >= config.maxPerSubject && !forcedTags.has(`school:${c.id}`)) return false;
    primaryIds.push(c.id);
    subjectCount.set(c.subjectKey, used + 1);
    return true;
  };

  for (const id of forcedIds.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))) {
    take(eligible.find((c) => c.id === id)!);
  }

  let budget = target;
  for (const id of primaryIds) {
    budget -= minutesFor(
      eligible.find((c) => c.id === id)!,
      config,
    );
  }
  for (const r of ranked) {
    if (primaryIds.length >= config.maxPrimaryTasks) break;
    const c = r.candidate;
    const m = minutesFor(c, config);
    // Guardrail 2 — time compatibility. Always allow the first primary task.
    if (primaryIds.length > 0 && m > budget && budget < config.minMeaningfulMinutes) continue;
    if (take(c)) budget -= m;
  }

  const toTask = (c: PlannerCandidate): PlannedTask => ({
    candidate: c,
    minutes: minutesFor(c, config),
    score: scoreById.get(c.id) ?? 0,
    reasons: reasonsFor(c, forcedTags),
  });

  const primary = primaryIds
    .map((id) => toTask(eligible.find((c) => c.id === id)!))
    .sort((a, b) => b.score - a.score);

  const plannedMinutes = primary.reduce((s, t) => s + t.minutes, 0);

  const optional: PlannedTask[] = [];
  let leftover = Math.max(0, target - plannedMinutes);
  for (const r of ranked) {
    if (optional.length >= config.maxOptionalTasks) break;
    if (primaryIds.includes(r.candidate.id)) continue;
    const m = minutesFor(r.candidate, config);
    if (m <= leftover + config.minMeaningfulMinutes) {
      optional.push(toTask(r.candidate));
      leftover -= m;
    }
  }

  return {
    asOf: input.asOf,
    energy: input.energy,
    capacityMinutes: input.capacityMinutes,
    targetMinutes: target,
    primary,
    optional,
    plannedMinutes,
    unfilledMinutes: target - plannedMinutes,
    algorithmVersion: config.version,
  };
}

/** Re-export for callers that only need the raw priority of one candidate. */
export { computePriority };
