'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Lightbulb, ListChecks, Search, SlidersHorizontal, BookOpen } from 'lucide-react';
import { API } from '@/lib/api';
import PDFReaderApplet from '@/components/ba-tools/PDFReaderApplet';
import UserStoryGame from '@/components/ba-tools/UserStoryGame';
import AcceptanceCriteriaGame from '@/components/ba-tools/AcceptanceCriteriaGame';
import ElicitationGame from '@/components/ba-tools/ElicitationGame';
import MoscowGame from '@/components/ba-tools/MoscowGame';
import GlossaryReference from '@/components/ba-tools/GlossaryReference';
import s from './batools.module.css';

type Applet = 'babok' | 'glossary' | 'userstory' | 'acceptancecriteria' | 'elicitation' | 'moscow';

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

function AccordionSection({ item, expanded, onToggle }: {
  item: { key: Applet; label: string; description: string; icon: typeof FileText; content: React.ReactNode };
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  return (
    <div className={s.section}>
      <button className={s.sectionHeader} onClick={onToggle} aria-expanded={expanded} aria-controls={`applet-${item.key}`}>
        <div className={s.iconWrap}><Icon size={18} /></div>
        <div className={s.sectionTitleBlock}>
          <div className={s.sectionTitle}>{item.label}</div>
          <div className={s.sectionDesc}>{item.description}</div>
        </div>
        <span className={s.chevron}>{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className={s.sectionBody} id={`applet-${item.key}`}>
          {item.content}
        </div>
      )}
    </div>
  );
}

export default function WSBAToolsPage() {
  const [checking, setChecking] = useState(true);
  const [openKey, setOpenKey] = useState<Applet | null>(null);
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
      <div className={s.page}>
        <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />
        <div className={s.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.7)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  function toggle(key: Applet) {
    setOpenKey(prev => (prev === key ? null : key));
  }

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.header}>
          <h1 className={s.wordmark}>WorkSquatch</h1>
          <p className={s.subtitle}>BA TOOLS</p>
        </div>

        <div className={s.groupLabel}>Reference</div>
        <div className={s.accordion}>
          {REFERENCE.map(item => (
            <AccordionSection key={item.key} item={item} expanded={openKey === item.key} onToggle={() => toggle(item.key)} />
          ))}
        </div>

        <div className={s.groupLabel}>Practice</div>
        <div className={s.accordion}>
          {PRACTICE.map(item => (
            <AccordionSection key={item.key} item={item} expanded={openKey === item.key} onToggle={() => toggle(item.key)} />
          ))}
        </div>
      </div>
    </div>
  );
}
