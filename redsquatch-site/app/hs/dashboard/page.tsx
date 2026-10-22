'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { QuoteWidget } from '@/components/QuoteWidget';
import { HistoryWidget } from '@/components/HistoryWidget';
import { WeatherWidget } from '@/components/WeatherWidget';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';

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

  if (loading) return <PageLoader label="Loading dashboard…" />;

  return (
    <div>
      {/* ── Widgets ───────────────────────────────────────────────────────── */}
      <main className="p-6 space-y-5">
        {user && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.78)', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
            Welcome back, <span style={{ color: 'rgba(212,163,115,0.9)' }}>{user.displayName || user.username}</span>
          </p>
        )}
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
