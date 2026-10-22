'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { Zap } from 'lucide-react';
import AppletModal from '@/components/AppletModal';
import SpanishTutor from '@/components/trackers/SpanishTutor';
import MexicoCitizenshipTracker from '@/components/trackers/MexicoCitizenshipTracker';
import PedroFanTracker from '@/components/trackers/PedroFanTracker';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';

type Applet = 'spanishtutor' | 'citizenship' | 'fantracker' | null;

export default function HSMexicanPage() {
  const [loading, setLoading] = useState(true);
  const [activeApplet, setActiveApplet] = useState<Applet>(null);
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

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 space-y-8">
      {/* Header */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>
            Mexican
          </h1>
        </CopperPanel>
      </div>

      {/* Tool cards */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'spanishtutor' as const,label: 'Spanish Tutor',      description: 'Daily drills with spaced repetition',    },
            { key: 'citizenship' as const, label: 'Citizenship Tracker',description: 'Mexico citizenship document checklist',  },
            { key: 'fantracker' as const,  label: 'Pedro Fan Tracker',  description: 'FAN research tracker for Pedro Ortiz Preciado', },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveApplet(t.key)}
              className="rs-applet-trigger"
            >
              <div className="rs-applet-card">
                <div className="rs-applet-icon">
                  <Zap size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="rs-applet-title">{t.label}</h3>
                  <p className="rs-applet-desc">{t.description}</p>
                </div>
                <div className="rs-applet-bar" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <AppletModal isOpen={activeApplet === 'spanishtutor'} title="Spanish Tutor" onClose={() => setActiveApplet(null)}>
        <SpanishTutor />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'citizenship'} title="Mexico Citizenship Tracker" onClose={() => setActiveApplet(null)} wide>
        <MexicoCitizenshipTracker />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'fantracker'} title="Pedro Fan Tracker" onClose={() => setActiveApplet(null)} wide>
        <PedroFanTracker />
      </AppletModal>
    </div>
  );
}
