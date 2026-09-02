/**
 * Pure domain helper — no framework, no I/O. Establishes the pattern that
 * `src/domain` code is testable in isolation with Vitest and a plain node
 * environment (see docs/ARCHITECTURE.md).
 */

export type SystemStatus = 'ok' | 'degraded';

export interface SystemChecks {
  [name: string]: boolean;
}

/** `ok` only when every check passes; `degraded` otherwise. Empty set is `ok`. */
export function systemStatus(checks: SystemChecks): SystemStatus {
  return Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
}
