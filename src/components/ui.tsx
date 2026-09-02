import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from './icons';

/* ---- layout ---- */

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[440px] flex-col bg-paper pb-20 shadow-[0_0_60px_-30px_rgba(23,20,15,0.25)]">
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
  back,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <header className="flex items-start gap-3 px-5 pb-3 pt-5">
      {back && (
        <Link href={back} aria-label="Back" className="mt-1 text-muted">
          <ChevronLeft />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function SectionLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-mono text-[11px] font-semibold uppercase tracking-[0.09em] text-faint ${className}`}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  className = '',
  lead = false,
}: {
  children: ReactNode;
  className?: string;
  lead?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-card p-4 ${
        lead ? 'border-[1.5px] border-ink' : 'border border-line'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---- data display ---- */

type Tone = 'ink' | 'ok' | 'warn' | 'bad';

const barColor: Record<Tone, string> = {
  ink: 'bg-ink',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
};

export function Bar({
  value,
  tone = 'ink',
  className = '',
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-track ${className}`}>
      <div
        className={`h-full rounded-full ${barColor[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

const chipTone: Record<string, string> = {
  default: 'bg-sink text-muted',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  accent: 'bg-accent-soft text-accent',
};

export function Chip({
  children,
  tone = 'default',
  dashed = false,
}: {
  children: ReactNode;
  tone?: keyof typeof chipTone;
  dashed?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${
        dashed ? 'border border-dashed border-line text-faint' : chipTone[tone]
      }`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="font-mono text-[10px] font-medium uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="mt-1.5 font-display text-[15px] font-bold leading-tight text-ink">
        {value}
      </div>
      {sub && <div className="mt-1 font-mono text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

export function RowLink({
  href,
  children,
  right,
}: {
  href: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 border-b border-line-soft py-3 text-ink last:border-0"
    >
      <div className="min-w-0 flex-1">{children}</div>
      <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink">
        {right}
        <ChevronRight size={13} className="text-faint" />
      </span>
    </Link>
  );
}

/* ---- actions ---- */

export function PrimaryButton({
  children,
  href,
  className = '',
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  const cls = `flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-4 text-[15px] font-semibold text-accent-ink ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}

export function GhostButton({ children, href }: { children: ReactNode; href?: string }) {
  const cls =
    'flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl border border-line bg-card px-4 text-[13px] font-semibold text-muted';
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}

export function SyntheticNote() {
  return (
    <div className="mx-5 mt-4 rounded-lg border border-dashed border-line px-3 py-2 font-mono text-[10px] leading-relaxed text-faint">
      SYNTHETIC TEST DATA · illustrative figures, not official CBSE weightage
    </div>
  );
}
