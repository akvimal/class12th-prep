/**
 * A small projection chart: readiness over time, actual-so-far as a solid line
 * and the projected path as a dashed line, against a horizontal target band.
 * Pure SVG, theme-aware through Tailwind text/stroke tokens.
 */

export interface TrajectoryPoint {
  /** 0..1 position along the x axis (start of plan → exam). */
  t: number;
  /** readiness 0..100 */
  value: number;
}

const W = 320;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 22, left: 26 };
const Y_MIN = 40;
const Y_MAX = 90;

function x(t: number) {
  return PAD.left + t * (W - PAD.left - PAD.right);
}
function y(v: number) {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, v));
  return PAD.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.top - PAD.bottom);
}
function path(points: TrajectoryPoint[]) {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ');
}

export function TrajectoryChart({
  actual,
  projected,
  target,
  nowT,
}: {
  actual: TrajectoryPoint[];
  projected: TrajectoryPoint[];
  target: number;
  nowT: number;
}) {
  const last = actual[actual.length - 1];
  const end = projected[projected.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Readiness projection: currently ${last?.value ?? 0}, projected ${end?.value ?? 0} against a target of ${target}`}
    >
      {[Y_MIN, (Y_MIN + Y_MAX) / 2, Y_MAX].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            className="stroke-line-soft"
            strokeWidth={1}
          />
          <text x={4} y={y(v) + 3} className="fill-faint" fontSize={8} fontFamily="monospace">
            {v}
          </text>
        </g>
      ))}

      {/* target line */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(target)}
        y2={y(target)}
        className="stroke-ok"
        strokeWidth={1.5}
        strokeDasharray="2 3"
      />
      <text
        x={W - PAD.right}
        y={y(target) - 4}
        textAnchor="end"
        className="fill-ok"
        fontSize={8}
        fontFamily="monospace"
      >
        target {target}
      </text>

      {/* now marker */}
      <line
        x1={x(nowT)}
        x2={x(nowT)}
        y1={PAD.top}
        y2={H - PAD.bottom}
        className="stroke-line"
        strokeWidth={1}
      />
      <text
        x={x(nowT)}
        y={H - 8}
        textAnchor="middle"
        className="fill-faint"
        fontSize={8}
        fontFamily="monospace"
      >
        now
      </text>

      {/* projected (dashed) */}
      <path
        d={path(projected)}
        className="stroke-muted"
        strokeWidth={2}
        fill="none"
        strokeDasharray="4 3"
      />
      {/* actual (solid) */}
      <path
        d={path(actual)}
        className="stroke-ink"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />

      {last && <circle cx={x(last.t)} cy={y(last.value)} r={3.5} className="fill-ink" />}
      {end && <circle cx={x(end.t)} cy={y(end.value)} r={3.5} className="fill-muted" />}
    </svg>
  );
}
