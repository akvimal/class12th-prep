import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  BookIcon,
  ChevronRight,
  ClockIcon,
  GearIcon,
  RevisionIcon,
  TestsIcon,
} from '@/components/icons';

export const dynamic = 'force-dynamic';

const ITEMS: {
  href: string;
  title: string;
  sub: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { href: '/', title: 'Overview', sub: 'Readiness, phase and needs-attention', icon: BookIcon },
  {
    href: '/trajectory',
    title: 'Impact on your goal',
    sub: 'Projection vs target, plan pressure',
    icon: TestsIcon,
  },
  {
    href: '/review',
    title: 'Weekly review',
    sub: 'Last week’s progress & next focus',
    icon: RevisionIcon,
  },
  { href: '/plan', title: 'Plan & dates', sub: 'Targets, capacity, phases', icon: ClockIcon },
  {
    href: '/reminders',
    title: 'Rhythm & reminders',
    sub: 'Study windows, adherence, calendar sync',
    icon: ClockIcon,
  },
  {
    href: '/exam-prep',
    title: 'SAT prep',
    sub: 'Domain priorities, weekly plan, session log',
    icon: TestsIcon,
  },
  { href: '/parent', title: 'Parent view', sub: 'Aggregate summary — later phase', icon: BookIcon },
  {
    href: '/course-correction',
    title: 'Course correction',
    sub: 'Get back on track',
    icon: GearIcon,
  },
];

export default function MorePage() {
  return (
    <main>
      <header className="px-5 pb-4 pt-5">
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink">More</h1>
      </header>

      <div className="px-5">
        {ITEMS.map(({ href, title, sub, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3.5 border-b border-line-soft py-3.5 last:border-0"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-ink">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">{title}</span>
              <span className="mt-0.5 block text-[11px] text-faint">{sub}</span>
            </span>
            <ChevronRight size={16} className="text-line" />
          </Link>
        ))}
      </div>

      <div className="mx-5 mt-5 rounded-lg bg-sink px-3 py-2.5 font-mono text-[10px] leading-relaxed text-faint">
        Build: coded UI shell on the synthetic seed · deterministic engine &amp; persistence live in
        Phases 0–3.
      </div>
      <div className="h-6" />
    </main>
  );
}
