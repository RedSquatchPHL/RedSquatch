'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { QuoteWidget } from '@/components/QuoteWidget';
import { HistoryWidget } from '@/components/HistoryWidget';
import { WeatherWidget } from '@/components/WeatherWidget';
import ThemeToggle from '@/components/ThemeToggle';
import CopperPanel from '@/components/cenote/CopperPanel';

export default function HSDashboardPage() {
  const [user,    setUser]    = useState<{ username: string; displayName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setUser(data.user);
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div
        className="glass-surface rounded-2xl px-10 py-8 text-center"
        style={{ minWidth: 220 }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 mx-auto mb-4 animate-spin"
          style={{ borderColor: 'rgba(184,115,51,0.2)', borderTopColor: '#b87333' }}
        />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* ── Glass header ──────────────────────────────────────────────────── */}
      <header className="glass-header sticky top-0 z-20 px-6 py-3.5">
        <div className="flex justify-between items-center gap-4">

          {/* Title */}
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: '#d4a373', textShadow: '0 0 20px rgba(184,115,51,0.35)' }}
            >
              HomeSquatch Dashboard
            </h1>
            {user && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Welcome back, <span style={{ color: 'rgba(212,163,115,0.8)' }}>{user.displayName || user.username}</span>
              </p>
            )}
          </div>

          {/* Controls */}
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
        </div>
      </header>

      {/* ── Widgets ───────────────────────────────────────────────────────── */}
      <main className="p-6 space-y-5">
        <CopperPanel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuoteWidget />
            <HistoryWidget />
            <WeatherWidget />
          </div>
        </CopperPanel>
      </main>
    </div>
  );
}
