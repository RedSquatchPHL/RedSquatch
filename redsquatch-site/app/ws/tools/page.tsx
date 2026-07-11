'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import DevelopmentWidget from '@/components/DevelopmentWidget';
import CopperPanel from '@/components/cenote/CopperPanel';

export default function WSToolsPage() {
  const [loading, setLoading] = useState(true);
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
            Tools
          </h1>
        </CopperPanel>
      </div>

      {/* Development */}
      <div className="max-w-5xl w-full">
        <div className="mb-4">
          <CopperPanel>
            <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
              Development
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Multi-tab code & text scratchpad, auto-saved as you type
            </p>
          </CopperPanel>
        </div>
        <DevelopmentWidget />
      </div>

      {/* Curriculum Tracker (placeholder) */}
      <div className="max-w-5xl w-full mb-8">
        <CopperPanel>
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Curriculum Tracker
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Coming soon
          </p>
        </CopperPanel>
      </div>
    </div>
  );
}
