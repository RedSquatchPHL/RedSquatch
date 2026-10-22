'use client';

import { usePathname } from 'next/navigation';
import { HS_NAV } from '@/lib/menuConfig';
import ThemeToggle from '@/components/ThemeToggle';
import ClockGateMenu from '@/components/ClockGateMenu';
import { useHsBeach } from '@/lib/hsBand';
import BrandMark from './BrandMark';
import LocationWidgets from './LocationWidgets';

// Shared HomeSquatch top bar (mounted once in app/hs/layout.tsx): two-tone brand
// + OS switch to WorkSquatch, current page name, the weather/world-clock chips (shared with
// /ws) and the Settings menu
// (ClockGateMenu in its header placement: clock in/out, navigation, quick links, account).
// Fixed 64px (h-16) so full-height pages can subtract it: calc(100vh - 4rem).
export default function HSHeader() {
  const pathname = usePathname() ?? '';
  const beach = useHsBeach();
  const current = HS_NAV.find(i => i.type === 'internal' && (pathname === i.path || pathname.startsWith(i.path + '/')));

  return (
    <header className="glass-header sticky top-0 z-20 px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <BrandMark side="home" />
        {current && (
          <span
            className="hidden sm:inline text-sm truncate"
            style={{ color: 'var(--rs-crumb, rgba(255,255,255,0.6))' }}
          >
            / {current.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <LocationWidgets />
        {/* Beach theme follows the ocean scene (picked from Settings), so the Auto/Day/Night switch only shows in classic mode. */}
        {!beach && <ThemeToggle />}
        <ClockGateMenu placement="header" />
      </div>
    </header>
  );
}
