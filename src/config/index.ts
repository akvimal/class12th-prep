/**
 * Versioned algorithm configuration.
 *
 * Scoring weights, recency factors, urgency multipliers, revision intervals
 * and plan thresholds are versioned data — never constants scattered through
 * UI or API code (AGENTS.md §4). Each config object carries an explicit
 * `version`, and every snapshot that consumes it records which version ran.
 *
 * Concrete records (`readiness-v1`, `planner-v1`, `revision-v1`) are added
 * with the engines that use them, from TASK-009 onward.
 */

export interface VersionedConfig {
  readonly version: string;
}
