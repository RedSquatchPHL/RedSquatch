'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Target, Trophy, Wrench, Gamepad2, ArrowLeftRight, LogOut } from 'lucide-react';
import { logout } from '@/lib/api';

// Label = destination page, same rule as WS's BottomToolbar.
const ITEMS = [
  { label: 'Dashboard', href: '/hs/dashboard', icon: LayoutDashboard },
  { label: 'Goals', href: '/hs/goals', icon: Target },
  { label: 'Sports', href: '/hs/sports', icon: Trophy },
  { label: 'Tools', href: '/hs/tools', icon: Wrench },
  { label: 'Downtime', href: '/hs/downtime', icon: Gamepad2 },
];

const tileClass = (isActive: boolean) =>
  `toolbar-tile stone-tile pointer-events-auto mono flex h-[92px] w-[72px] flex-col items-center justify-center gap-2 rounded-[14px] px-2 pb-2 pt-3 text-center text-[10px] uppercase tracking-[0.08em] transition-transform hover:-translate-y-1 ${
    isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)]'
  }`;

// WS-styled stone-tile toolbar for the HS layout, replacing MagnificationDock's
// glass/magnification look there. MagnificationDock itself is untouched — the
// legacy /dashboard route still uses it via app/dashboard/layout.tsx.
export default function HSToolbar() {
  const pathname = usePathname();

  return (
    <nav
      className="toolbar-shadow fixed bottom-0 left-0 right-0 z-30 flex justify-center gap-4 pb-6 pointer-events-none"
      aria-label="Bottom toolbar"
    >
      {ITEMS.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href} className={tileClass(pathname === href)}>
          <Icon size={27} />
          <span className="toolbar-tile-label">{label}</span>
        </Link>
      ))}

      <Link
        href="/ws/dashboard"
        onClick={() => localStorage.setItem('redsquatch-mode', 'work')}
        className={tileClass(false)}
      >
        <ArrowLeftRight size={27} />
        <span className="toolbar-tile-label">Switch</span>
      </Link>

      <Link href="/logout" onClick={logout} className={tileClass(false)}>
        <LogOut size={27} />
        <span className="toolbar-tile-label">Logout</span>
      </Link>
    </nav>
  );
}
