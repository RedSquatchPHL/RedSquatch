'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Lightbulb, ListChecks } from 'lucide-react';
import { API } from '@/lib/api';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import AppletModal from '@/components/AppletModal';
import PDFReaderApplet from '@/components/ba-tools/PDFReaderApplet';
import UserStoryGame from '@/components/ba-tools/UserStoryGame';
import AcceptanceCriteriaGame from '@/components/ba-tools/AcceptanceCriteriaGame';

type Applet = 'babok' | 'userstory' | 'acceptancecriteria' | null;

const APPLETS = [
  { key: 'babok' as const, label: 'BABOK Guide v3', description: 'Reference reader for the BABOK Guide (Member Edition)', icon: FileText },
  { key: 'userstory' as const, label: 'User Story Evaluation Game', description: 'Spot the solid story among the flawed ones — track your streak', icon: Lightbulb },
  { key: 'acceptancecriteria' as const, label: 'Acceptance Criteria Matching Challenge', description: 'Match a user story to the AC set that actually verifies it', icon: ListChecks },
];

export default function WSIntakePage() {
  const [checking, setChecking] = useState(true);
  const [activeApplet, setActiveApplet] = useState<Applet>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/'); return; }
        setChecking(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--copper-1)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="jungle-bg min-h-screen flex items-center justify-center p-6">
      <div className="stone-board stone-noise mono relative w-full max-w-[1200px] p-6 pb-24 text-[12px] text-[var(--copper-1)]">
        <HeaderBrand version="2.3" showVersion label="Business Analyst Tools" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {APPLETS.map(applet => {
            const Icon = applet.icon;
            return (
              <button
                key={applet.key}
                onClick={() => setActiveApplet(applet.key)}
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
                    <Icon size={24} style={{ color: '#b87333' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm" style={{ color: '#d4a373' }}>
                      {applet.label}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {applet.description}
                    </p>
                  </div>
                  <div
                    className="h-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                    style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AppletModal isOpen={activeApplet === 'babok'} title="BABOK Guide v3" onClose={() => setActiveApplet(null)} wide>
        <PDFReaderApplet />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'userstory'} title="User Story Evaluation Game" onClose={() => setActiveApplet(null)}>
        <UserStoryGame />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'acceptancecriteria'} title="Acceptance Criteria Matching Challenge" onClose={() => setActiveApplet(null)} wide>
        <AcceptanceCriteriaGame />
      </AppletModal>
    </div>
  );
}
