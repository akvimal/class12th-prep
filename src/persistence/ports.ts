/**
 * Repository ports.
 *
 * Application services depend on these interfaces only — never on a concrete
 * database or ORM. Two implementations exist:
 *
 *   - in-memory/   fixture-backed, used by the UI shell and unit tests
 *   - drizzle/     PostgreSQL via Drizzle, used in real deployments
 *
 * Real repository interfaces (curriculum, plan, progress, ...) are added here
 * from TASK-002 onward. For now it carries only the health probe so the seam
 * is real and exercised.
 */

export interface HealthProbe {
  /** Returns true when the backing store is reachable. Never throws. */
  isReachable(): Promise<boolean>;
}

export interface Repositories {
  health: HealthProbe;
}
