'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { BookIcon, MoreIcon, RevisionIcon, TestsIcon, TodayIcon } from './icons';

const TABS: { href: string; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { href: '/today', label: 'Today', icon: TodayIcon },
  { href: '/subjects', label: 'Subjects', icon: BookIcon },
  { href: '/revision', label: 'Revision', icon: RevisionIcon },
  { href: '/tests', label: 'Tests', icon: TestsIcon },
  { href: '/more', label: 'More', icon: MoreIcon },
];

/** The five tab destinations (plus the Dashboard root) show the nav; detail screens don't. */
const SHOW_ON = new Set(['/', '/today', '/subjects', '/revision', '/tests', '/more']);

export function BottomNav() {
  const pathname = usePathname() ?? '/';
  if (!SHOW_ON.has(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[440px] justify-between border-t border-line bg-paper px-1.5 pb-3.5 pt-2">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === '/today' && pathname === '/');
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] ${
              active ? 'font-semibold text-ink' : 'font-medium text-faint'
            }`}
          >
            <Icon size={21} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
