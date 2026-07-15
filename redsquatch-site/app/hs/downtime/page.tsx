'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import GamesModal from '@/components/GamesModal';
import CopperPanel from '@/components/cenote/CopperPanel';

export default function HSDowntimePage() {
  const [loading, setLoading] = useState(true);
  const [gamesOpen, setGamesOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
      {/* Header */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <h1 className="text-3xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Downtime
          </h1>
        </CopperPanel>
      </div>

      {/* Games */}
      <div className="max-w-5xl w-full">
        <div className="mb-4">
          <CopperPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
                  Games
                </h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  2048 and Wordle
                </p>
              </div>
              <button
                onClick={() => setGamesOpen(true)}
                className="glass-btn px-4 py-2 text-sm rounded-xl font-medium"
              >
                Play
              </button>
            </div>
          </CopperPanel>
        </div>
      </div>

      <GamesModal isOpen={gamesOpen} onClose={() => setGamesOpen(false)} />
    </div>
  );
}
