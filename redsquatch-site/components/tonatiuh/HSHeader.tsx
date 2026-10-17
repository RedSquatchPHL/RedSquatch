'use client';

import { usePathname, useRouter } from 'next/navigation';
import { HS_NAV } from '@/lib/menuConfig';
import ThemeToggle from '@/components/ThemeToggle';
import BrandMark from './BrandMark';

// Shared HomeSquatch top bar (mounted once in app/hs/layout.tsx): two-tone brand
// + OS switch to WorkSquatch, current page name, theme toggle and settings.
// Fixed 64px (h-16) so full-height pages can subtract it: calc(100vh - 4rem).
export default function HSHeader() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const current = HS_NAV.find(i => i.type === 'internal' && (pathname === i.path || pathname.startsWith(i.path + '/')));

  return (
    <header className="glass-header sticky top-0 z-20 px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <BrandMark side="home" />
        {current && (
          <span
            className="hidden sm:inline text-sm truncate"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            / {current.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={() => router.push('/settings')}
          className="glass-btn px-3.5 py-1.5 text-sm rounded-xl font-medium"
          title="Settings"
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  );
}
