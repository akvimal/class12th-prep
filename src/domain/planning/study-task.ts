import type { PlannerActivity } from './daily-planner';

/**
 * A planned academic action for one day (docs/DOMAIN_MODEL.md `StudyTask`).
 * The daily planner writes these; a study session resolves them; unresolved
 * ones roll into MISSED once their day has passed (docs/ALGORITHMS.md §6 —
 * missed work is *reprioritised*, never mechanically copied to tomorrow).
 */
export const STUDY_TASK_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED'] as const;
export type StudyTaskStatus = (typeof STUDY_TASK_STATUSES)[number];

/** Where the task sat in the day's plan. */
export const STUDY_TASK_SLOTS = ['PRIMARY', 'OPTIONAL'] as const;
export type StudyTaskSlot = (typeof STUDY_TASK_SLOTS)[number];

export type StudyTaskActivity = PlannerActivity;

/**
 * What a still-SCHEDULED task resolves to once we look back at its day.
 * Returns `null` while the day is still open (planned for today or later) —
 * the task stays SCHEDULED and the planner keeps offering it.
 */
export function resolveTaskStatus(input: {
  plannedDate: string;
  asOf: string;
  hadQualifyingSession: boolean;
}): Exclude<StudyTaskStatus, 'SCHEDULED' | 'CANCELLED'> | null {
  if (input.plannedDate >= input.asOf) return null;
  return input.hadQualifyingSession ? 'COMPLETED' : 'MISSED';
}
