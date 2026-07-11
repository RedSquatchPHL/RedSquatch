'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { QuoteWidget } from '@/components/QuoteWidget';
import { HistoryWidget } from '@/components/HistoryWidget';
import { WeatherWidget } from '@/components/WeatherWidget';
import CopperPanel from '@/components/cenote/CopperPanel';

export default function WSDashboardPage() {
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
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#b87333] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-4xl text-[#b87333]">Dashboard</h1>
            {user && (
              <p className="text-[#d4a373] text-sm mt-1">
                Welcome back, {user.displayName || user.username}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="text-xs border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-3 py-1.5"
          >
            Settings
          </button>
        </div>

        <CopperPanel>
          <QuoteWidget />
        </CopperPanel>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CopperPanel>
            <HistoryWidget />
          </CopperPanel>
          <CopperPanel>
            <WeatherWidget />
          </CopperPanel>
        </div>
      </div>
    </div>
  );
}
