import { plannerV1, type PlannerConfig } from '@/config/planner';
import { priorityV1 } from '@/config/priority';
import { prioritize } from './priority';
import type { PlannerActivity, PlannerCandidate, ReasonCode } from './daily-planner';

/**
 * Study Now (docs/ALGORITHMS.md §4): given the minutes the student has right
 * now and the candidate set, return exactly one task with reason codes and a
 * timed micro-plan. Deterministic for fixed candidates + config.
 */

export interface MicroStep {
  /** Minute offsets within the session. */
  fromMinute: number;
  toMinute: number;
  text: string;
}

export interface StudyNowResult {
  task: {
    candidate: PlannerCandidate;
    minutes: number;
    reasons: ReasonCode[];
  } | null;
  microPlan: MicroStep[];
  availableMinutes: number;
  algorithmVersion: string;
}

export interface StudyNowInput {
  candidates: PlannerCandidate[];
  availableMinutes: number;
  asOf: string;
}

function estimate(c: PlannerCandidate, config: PlannerConfig): number {
  return c.estimatedMinutes > 0
    ? c.estimatedMinutes
    : (config.defaultMinutesByActivity[c.activity] ?? config.minMeaningfulMinutes);
}

function reasonsFor(c: PlannerCandidate): ReasonCode[] {
  const p = c.priority;
  const out: ReasonCode[] = [];
  if (p.daysUntilSchoolTest != null && p.daysUntilSchoolTest >= 0 && p.daysUntilSchoolTest <= 7) {
    out.push('SCHOOL_TEST_SOON');
  }
  if (p.effectiveReadiness < 55) out.push('LOW_READINESS');
  if (p.revisionDue !== 'NONE') out.push('REVISION_DUE');
  if ((p.boardWeight ?? 0) >= 8) out.push('HIGH_BOARD_WEIGHT');
  if (p.missedCount > 0) out.push('BACKLOG');
  return out;
}

const SPANS: Record<PlannerActivity, ReadonlyArray<{ pct: number; text: string }>> = {
  LEARN: [
    { pct: 0.15, text: 'Recall what you already know about this chapter, then check' },
    { pct: 0.7, text: 'Work through the core concepts with one solved example each' },
    { pct: 0.15, text: 'Write a summary of the key ideas in your own words' },
  ],
  PRACTISE: [
    { pct: 0.1, text: 'Recall the key formulae from memory' },
    { pct: 0.75, text: 'Board-style problems on the weakest sub-topics' },
    { pct: 0.15, text: 'Mark every error by type (concept / calculation / misread)' },
  ],
  ACTIVE_RECALL: [
    { pct: 0.7, text: 'Answer the main questions from memory — no notes' },
    { pct: 0.3, text: 'Check against the text and note exactly where you were wrong' },
  ],
  REVISION: [
    { pct: 0.55, text: 'Retrieve the whole chapter from memory (blank-page)' },
    { pct: 0.3, text: 'Re-study only the parts you could not retrieve' },
    { pct: 0.15, text: 'Do 3 quick recall questions to confirm' },
  ],
  PYQ: [
    { pct: 0.1, text: 'Set a timer and gather past-paper questions for this chapter' },
    { pct: 0.75, text: 'Attempt them under exam conditions' },
    { pct: 0.15, text: 'Self-mark against the scheme and log marks lost' },
  ],
};

function microPlan(activity: PlannerActivity, minutes: number): MicroStep[] {
  const spans = SPANS[activity];
  const steps: MicroStep[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    const to = i === spans.length - 1 ? minutes : Math.round(cursor + span.pct * minutes);
    steps.push({ fromMinute: cursor, toMinute: to, text: span.text });
    cursor = to;
  });
  return steps;
}

export function pickStudyNow(
  input: StudyNowInput,
  config: PlannerConfig = plannerV1,
): StudyNowResult {
  const empty: StudyNowResult = {
    task: null,
    microPlan: [],
    availableMinutes: input.availableMinutes,
    algorithmVersion: config.version,
  };
  if (input.availableMinutes < config.minMeaningfulMinutes) return empty;

  // Guardrail 1 + step 2: eligible, and can be meaningfully done in the time.
  const usable = input.candidates.filter(
    (c) => c.prerequisitesMet && estimate(c, config) - input.availableMinutes <= 10,
  );
  if (usable.length === 0) return empty;

  const ranked = prioritize(
    usable.map((candidate) => ({ candidate, input: candidate.priority })),
    priorityV1,
  );

  // Guardrail 5 (school urgency) wins if such a task exists; else the top rank.
  const forced = ranked.find(
    (r) =>
      r.candidate.priority.daysUntilSchoolTest != null &&
      r.candidate.priority.daysUntilSchoolTest >= 0 &&
      r.candidate.priority.daysUntilSchoolTest <= config.schoolTestForceWithinDays,
  );
  const chosen = (forced ?? ranked[0])!.candidate;
  const minutes = Math.min(estimate(chosen, config), input.availableMinutes);

  return {
    task: { candidate: chosen, minutes, reasons: reasonsFor(chosen) },
    microPlan: microPlan(chosen.activity, minutes),
    availableMinutes: input.availableMinutes,
    algorithmVersion: config.version,
  };
}
