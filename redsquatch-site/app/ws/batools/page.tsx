'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Lightbulb, ListChecks, Search, SlidersHorizontal, BookOpen } from 'lucide-react';
import { API } from '@/lib/api';
import AppletModal from '@/components/AppletModal';
import PDFReaderApplet from '@/components/ba-tools/PDFReaderApplet';
import UserStoryGame from '@/components/ba-tools/UserStoryGame';
import AcceptanceCriteriaGame from '@/components/ba-tools/AcceptanceCriteriaGame';
import ElicitationGame from '@/components/ba-tools/ElicitationGame';
import MoscowGame from '@/components/ba-tools/MoscowGame';
import GlossaryReference from '@/components/ba-tools/GlossaryReference';
import s from './batools.module.css';

type Applet = 'babok' | 'glossary' | 'userstory' | 'acceptancecriteria' | 'elicitation' | 'moscow';
type Group = 'all' | 'reference' | 'practice';

const REFERENCE = [
  { key: 'babok' as const, label: 'BABOK Guide v3', description: 'Reference reader for the BABOK Guide (Member Edition)', icon: FileText, content: <PDFReaderApplet /> },
  { key: 'glossary' as const, label: 'BA Glossary', description: 'Searchable quick-reference for core BA terms and techniques', icon: BookOpen, content: <GlossaryReference /> },
];

const PRACTICE = [
  { key: 'userstory' as const, label: 'User Story Evaluation Game', description: 'Spot the solid story among the flawed ones — track your streak', icon: Lightbulb, content: <UserStoryGame /> },
  { key: 'acceptancecriteria' as const, label: 'Acceptance Criteria Matching Challenge', description: 'Match a user story to the AC set that actually verifies it', icon: ListChecks, content: <AcceptanceCriteriaGame /> },
  { key: 'elicitation' as const, label: 'Elicitation Technique Matcher', description: 'Pick the right technique for the situation — every option is real, only one fits', icon: Search, content: <ElicitationGame /> },
  { key: 'moscow' as const, label: 'MoSCoW Prioritization Challenge', description: 'Sort a backlog into Must/Should/Could/Won\'t and defend the call', icon: SlidersHorizontal, content: <MoscowGame /> },
];

const ALL_TOOLS = [...REFERENCE, ...PRACTICE];

export default function WSBAToolsPage() {
  const [checking, setChecking] = useState(true);
  const [group, setGroup] = useState<Group>('all');
  const [activeKey, setActiveKey] = useState<Applet | null>(null);
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

  const visibleTools = useMemo(() => {
    if (group === 'reference') return REFERENCE;
    if (group === 'practice') return PRACTICE;
    return ALL_TOOLS;
  }, [group]);

  const active = ALL_TOOLS.find(t => t.key === activeKey) ?? null;

  if (checking) {
    return (
      <div className={s.page}>
        <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />
        <div className={s.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.7)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.header}>
          <h1 className={s.wordmark}>WorkSquatch</h1>
          <p className={s.subtitle}>BA TOOLS</p>
        </div>

        <div className={s.presetRow}>
          <button
            className={`${s.presetBtn} ${group === 'all' ? s.presetBtnActive : ''}`}
            onClick={() => setGroup('all')}
          >
            All
          </button>
          <button
            className={`${s.presetBtn} ${group === 'reference' ? s.presetBtnActive : ''}`}
            onClick={() => setGroup('reference')}
          >
            Reference
          </button>
          <button
            className={`${s.presetBtn} ${group === 'practice' ? s.presetBtnActive : ''}`}
            onClick={() => setGroup('practice')}
          >
            Practice
          </button>
        </div>

        <div className={s.toggleGrid}>
          {visibleTools.map(tool => (
            <button key={tool.key} className={s.toggleCard} onClick={() => setActiveKey(tool.key)}>
              <div className={s.toggleIconWrap}><tool.icon size={18} /></div>
              <div>
                <p className={s.toggleLabel}>{tool.label}</p>
                <p className={s.toggleDesc}>{tool.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AppletModal isOpen={active !== null} title={active?.label ?? ''} onClose={() => setActiveKey(null)} wide>
        {active?.content}
      </AppletModal>
    </div>
  );
}
