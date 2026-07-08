'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import CodeNotesEditor from '@/components/CodeNotesEditor';

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
      <div className="glass-surface rounded-2xl px-6 py-4 w-full max-w-5xl">
        <h1 className="text-3xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Tools
        </h1>
      </div>

      {/* Code Notes */}
      <div className="max-w-5xl w-full">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Code Notes
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Syntax-highlighted scratchpad for code snippets, auto-saved as you type
          </p>
        </div>
        <CodeNotesEditor height="400px" />
      </div>

      {/* Curriculum Tracker (placeholder) */}
      <div className="max-w-5xl w-full mb-8">
        <div className="glass-surface rounded-2xl px-6 py-4 mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Curriculum Tracker
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
