'use client';

import Link from 'next/link';
import { LayoutDashboard, Target, Inbox, Briefcase, Wrench, LogOut } from 'lucide-react';

type ToolbarItem = 'dashboard' | 'goals' | 'intake' | 'work' | 'tools' | 'logout';

// Label = destination page, so the toolbar never lies about where a button goes.
const ITEMS: { key: ToolbarItem; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/ws/dashboard', icon: LayoutDashboard },
  { key: 'goals', label: 'Goals', href: '/ws/goals', icon: Target },
  { key: 'intake', label: 'Intake', href: '/ws/intake', icon: Inbox },
  { key: 'work', label: 'Work', href: '/ws/work', icon: Briefcase },
  { key: 'tools', label: 'Tools', href: '/ws/tools', icon: Wrench },
  { key: 'logout', label: 'Logout', href: '/logout', icon: LogOut },
];

interface BottomToolbarProps {
  activeItem: ToolbarItem;
}

export default function BottomToolbar({ activeItem }: BottomToolbarProps) {
  return (
    <nav
      className="toolbar-shadow fixed bottom-0 left-0 right-0 z-30 flex justify-center gap-4 pb-6 pointer-events-none"
      aria-label="Bottom toolbar"
    >
      {ITEMS.map(({ key, label, href, icon: Icon }) => {
        const isActive = key === activeItem;
        return (
          <Link
            key={key}
            href={href}
            className={`stone-tile pointer-events-auto mono flex h-[92px] w-[72px] flex-col items-center justify-center gap-2 rounded-[14px] px-2 pb-2 pt-3 text-center text-[10px] uppercase tracking-[0.08em] transition-transform hover:-translate-y-1 ${
              isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)] hover:text-[var(--copper-1)]'
            }`}
          >
            <Icon size={27} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
