'use client';

import Link from 'next/link';
import { Crosshair, Scroll, Map, Settings, Radio, LogOut } from 'lucide-react';

type ToolbarItem = 'hunt' | 'logs' | 'maps' | 'config' | 'comms' | 'exit';

const ITEMS: { key: ToolbarItem; label: string; href: string; icon: typeof Crosshair }[] = [
  { key: 'hunt', label: 'Hunt', href: '/ws/dashboard', icon: Crosshair },
  { key: 'logs', label: 'Logs', href: '/ws/goals', icon: Scroll },
  { key: 'maps', label: 'Maps', href: '/ws/intake', icon: Map },
  { key: 'config', label: 'Config', href: '/ws/work', icon: Settings },
  { key: 'comms', label: 'Comms', href: '/ws/tools', icon: Radio },
  { key: 'exit', label: 'Exit', href: '/logout', icon: LogOut },
];

interface BottomToolbarProps {
  activeItem: ToolbarItem;
}

export default function BottomToolbar({ activeItem }: BottomToolbarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-6 pointer-events-none">
      <div
        className="stone-board pointer-events-auto flex items-center gap-1 px-2 py-2"
        style={{ borderRadius: '9999px' }}
      >
        {ITEMS.map(({ key, label, href, icon: Icon }) => {
          const isActive = key === activeItem;
          return (
            <Link
              key={key}
              href={href}
              className={`mono flex flex-col items-center gap-0.5 px-4 py-2 text-[10px] uppercase tracking-[0.08em] ${
                isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)] hover:text-[var(--copper-1)]'
              }`}
              style={{ borderRadius: '9999px', background: isActive ? 'rgba(var(--copper-glow-rgb), 0.12)' : 'transparent' }}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
