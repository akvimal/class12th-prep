/**
 * Calendar-date arithmetic on ISO `YYYY-MM-DD` strings.
 *
 * All operations anchor to midnight UTC, so results are deterministic and
 * independent of the machine's timezone. There is no calendar-month branching
 * anywhere — only day counts and comparisons.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(iso: string): number {
  if (!ISO_DATE.test(iso)) throw new RangeError(`not an ISO date: "${iso}"`);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  if (Number.isNaN(ms)) throw new RangeError(`invalid date: "${iso}"`);
  return ms;
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + Math.trunc(days) * DAY_MS);
}

/** Whole days from `a` to `b` (negative if `b` is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Clamp `value` into [`lo`, `hi`]. Assumes `lo <= hi`. */
export function clampDate(value: string, lo: string, hi: string): string {
  return minDate(maxDate(value, lo), hi);
}

/** Day of week for a calendar date: 0 = Sunday .. 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return new Date(toUtc(iso)).getUTCDay();
}

/** Inclusive list of ISO dates from `from` to `to`. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let ms = toUtc(from); ms <= toUtc(to); ms += DAY_MS) out.push(fromUtc(ms));
  return out;
}

/**
 * The calendar date "now" in an IANA timezone (e.g. "Asia/Kolkata"). School and
 * exam dates are interpreted in the student's timezone (docs/ARCHITECTURE.md).
 * `instant` defaults to the current time; pass one to keep tests deterministic.
 */
export function currentDateInZone(timeZone: string, instant: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
