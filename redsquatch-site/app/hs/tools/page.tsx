'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { Zap } from 'lucide-react';
import CopperPanel from '@/components/cenote/CopperPanel';

export default function HSToolsPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setLoading(false);
      } catch {
        router.push('/login');
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

      {/* Tool cards */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'stirling' as const, label: 'Stirling-PDF', description: 'PDF tools & utilities (opens in new tab)', url: 'https://pdf.redsquatch.com' },
          ]).map((t) => (
            <a
              key={t.key}
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div
                className="glass-surface rounded-xl p-3 h-full flex flex-col gap-2 border border-transparent"
                style={{
                  borderColor: 'rgba(184,115,51,0.22)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '#b87333';
                  el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(184,115,51,0.22)';
                  el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div
                  className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
                  style={{ backgroundColor: '#b8733322' }}
                >
                  <Zap size={24} style={{ color: '#b87333' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm" style={{ color: '#d4a373' }}>
                    {t.label}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t.description}
                  </p>
                </div>
                <div
                  className="h-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
