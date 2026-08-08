'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { FileText, Lightbulb, ListChecks } from 'lucide-react';
import { API } from '@/lib/api';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecMotion from '@/components/aztec/AztecMotion';
import AppletModal from '@/components/AppletModal';
import PDFReaderApplet from '@/components/ba-tools/PDFReaderApplet';
import UserStoryGame from '@/components/ba-tools/UserStoryGame';
import AcceptanceCriteriaGame from '@/components/ba-tools/AcceptanceCriteriaGame';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

type Applet = 'babok' | 'userstory' | 'acceptancecriteria' | null;

// All three are reference/practice material rather than active work, so they
// share the codex glyph family (archive/record-keeping) — see AztecPanel.
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
      <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} flex items-center justify-center min-h-screen`}>
        <div className="text-[var(--ac-copper-light)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} min-h-screen flex items-center justify-center p-6`}>
      <AztecMotion marqueeItems={['Goals', 'Work Items', 'Sports', 'Tools', 'RedSquatch']} />

      <div className="relative z-[1] w-full max-w-[1200px] pb-24">
        <AztecHeader label="BUSINESS ANALYST TOOLS" />

        <div className="ac-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {APPLETS.map(applet => {
            const Icon = applet.icon;
            return (
              <button
                key={applet.key}
                onClick={() => setActiveApplet(applet.key)}
                className="ac-panel ac-panel--codex group cursor-pointer text-left flex flex-col gap-2"
                data-stagger
              >
                <span className="ac-corner ac-corner--tl" />
                <span className="ac-corner ac-corner--tr" />
                <span className="ac-corner ac-corner--bl" />
                <span className="ac-corner ac-corner--br" />
                <div
                  className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
                  style={{ backgroundColor: 'rgba(184,115,51,0.13)' }}
                >
                  <Icon size={24} className="text-[var(--ac-copper)]" />
                </div>
                <div className="flex-1">
                  <h3 style={{ fontFamily: 'var(--font-unbounded)' }} className="font-bold text-sm text-[var(--ac-copper-light)]">
                    {applet.label}
                  </h3>
                  <p className="text-xs mt-0.5 text-[var(--ac-stone-light)]">
                    {applet.description}
                  </p>
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
