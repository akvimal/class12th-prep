import type { VersionedConfig } from './index';

/**
 * Daily-planner configuration (docs/ALGORITHMS.md §3 guardrails, §5). Versioned
 * — a StudyTask stores the planner version that produced it.
 */
export interface PlannerConfig extends VersionedConfig {
  /** Hard cap on primary cards (docs/ALGORITHMS.md §5: "three primary cards"). */
  maxPrimaryTasks: number;
  /** Optional "if time remains" cards shown beyond the primary set. */
  maxOptionalTasks: number;
  /** No more than this many primary cards from one subject (diversity guardrail). */
  maxPerSubject: number;
  /**
   * Energy multiplier on the day's capacity minutes. LOW trims the plan, HIGH
   * stretches it — the plan never *exceeds* real capacity silently, this only
   * scales the target down/up within it.
   */
  energyCapacityFactor: { LOW: number; OK: number; HIGH: number };
  /**
   * A task shorter than this can't be done meaningfully — dropped by the
   * time-compatibility guardrail when the remaining budget is below it.
   */
  minMeaningfulMinutes: number;
  /**
   * Revision-starvation guardrail: if any candidate has revision due, force at
   * least one revision task into the primary set.
   */
  guaranteeRevisionWhenDue: boolean;
  /**
   * School-urgency guardrail: if a chapter has a school test within this many
   * days, force its task into the primary set.
   */
  schoolTestForceWithinDays: number;
  /**
   * Low-priority starvation guardrail: a task requeued at least this many times
   * is forced in regardless of score.
   */
  starvationMissedCount: number;
  /** Estimated minutes per activity, used when a candidate has no explicit estimate. */
  defaultMinutesByActivity: Record<string, number>;
}

export const plannerV1: PlannerConfig = {
  version: 'planner-v1',
  maxPrimaryTasks: 3,
  maxOptionalTasks: 2,
  maxPerSubject: 2,
  energyCapacityFactor: { LOW: 0.6, OK: 1.0, HIGH: 1.15 },
  minMeaningfulMinutes: 15,
  guaranteeRevisionWhenDue: true,
  schoolTestForceWithinDays: 3,
  starvationMissedCount: 3,
  defaultMinutesByActivity: {
    LEARN: 40,
    PRACTISE: 40,
    ACTIVE_RECALL: 20,
    REVISION: 25,
    PYQ: 35,
  },
};
