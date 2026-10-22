'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Waves } from 'lucide-react';
import { HS_NAV } from '@/lib/menuConfig';
import ThemeToggle from '@/components/ThemeToggle';
import BrandMark from './BrandMark';
import { PRESET_NAMES, loadOverride, nextOverride, saveOverride, subscribeOverride, type Override } from '@/lib/oceanScene';

// Shared HomeSquatch top bar (mounted once in app/hs/layout.tsx): two-tone brand
// + OS switch to WorkSquatch, current page name, theme toggle and settings.
// Fixed 64px (h-16) so full-height pages can subtract it: calc(100vh - 4rem).
export default function HSHeader() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [scene, setScene] = useState<Override>('auto');
  useEffect(() => {
    setScene(loadOverride());
    return subscribeOverride(setScene);
  }, []);
  const sceneLabel = scene === 'auto' ? 'Auto' : PRESET_NAMES[scene];
  const current = HS_NAV.find(i => i.type === 'internal' && (pathname === i.path || pathname.startsWith(i.path + '/')));

  return (
    <header className="glass-header sticky top-0 z-20 px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <BrandMark side="home" />
        {current && (
          <span
            className="hidden sm:inline text-sm truncate"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            / {current.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => saveOverride(nextOverride(scene))}
          className="glass-btn px-3 py-1.5 text-sm rounded-xl font-medium flex items-center gap-1.5"
          title={`Background: ${sceneLabel} (click to cycle: Auto, Dawn, Morning, Midday, Golden hour, Sunset, Moonlit)`}
          aria-label={`Background time of day: ${sceneLabel}. Click to change.`}
        >
          <Waves size={15} aria-hidden />
          <span className="hidden sm:inline">{sceneLabel}</span>
        </button>
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
