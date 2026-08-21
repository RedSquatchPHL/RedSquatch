'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { API } from '@/lib/api';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecPanel from '@/components/aztec/AztecPanel';
import AztecMotion from '@/components/aztec/AztecMotion';
import styles from '@/styles/roadmap.module.css';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

type Category = 'did_well' | 'demonstrate' | 'improve';

type RoadmapItem = {
  id: number;
  category: Category;
  text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const SECTIONS: { category: Category; title: string; intro: string; family: 'codex' | 'eagle' | 'fire' }[] = [
  {
    category: 'did_well',
    title: 'What I Did Well',
    intro: 'Concrete examples worth pointing back to — proof it\'s in me, not just a one-off.',
    family: 'codex',
  },
  {
    category: 'demonstrate',
    title: 'What I Need to Consistently Demonstrate',
    intro: 'The standard, every ticket, every week — not just when it\'s convenient.',
    family: 'eagle',
  },
  {
    category: 'improve',
    title: 'What I Can Improve Upon',
    intro: 'Open growth edges to keep working, honestly.',
    family: 'fire',
  },
];

export default function WorkRoadmapPage() {
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [drafts, setDrafts] = useState<Record<Category, string>>({ did_well: '', demonstrate: '', improve: '' });
  const [savingId, setSavingId] = useState<number | null>(null);
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

  async function loadItems() {
    const res = await fetch(`${API}/api/client/work-roadmap`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
    }
  }

  useEffect(() => {
    if (checking) return;
    loadItems();
  }, [checking]);

  const byCategory = useMemo(() => {
    const map: Record<Category, RoadmapItem[]> = { did_well: [], demonstrate: [], improve: [] };
    for (const item of items) map[item.category].push(item);
    return map;
  }, [items]);

  async function handleAdd(category: Category) {
    const text = drafts[category].trim();
    if (!text) return;
    const res = await fetch(`${API}/api/client/work-roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ category, text }),
    });
    if (res.ok) {
      setDrafts(prev => ({ ...prev, [category]: '' }));
      loadItems();
    }
  }

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/client/work-roadmap/${id}`, { method: 'DELETE', credentials: 'include' });
  }

  // Debounced-by-blur save: the textarea edits local state immediately for a
  // responsive feel, and only PUTs once the field loses focus.
  async function handleSaveText(id: number, text: string) {
    setSavingId(id);
    await fetch(`${API}/api/client/work-roadmap/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });
    setSavingId(null);
  }

  function handleLocalTextChange(id: number, text: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, text } : i)));
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#b87333' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`work-page aztec-command ${unbounded.variable} ${jbMono.variable} ${styles.page} pb-28`}>
      <AztecMotion marqueeItems={['Goals', 'Work Items', 'Sports', 'Tools', 'RedSquatch']} />

      <div className="relative z-[1] max-w-[1400px] mx-auto mb-6">
        <AztecHeader label="OVERVIEW" />
      </div>

      <div className={`relative z-[1] ${styles.content}`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Roadmap</h1>
            <p className={styles.subheader}>{items.length} note{items.length === 1 ? '' : 's'} — a standing check against the last review</p>
          </div>
          <Link href="/ws/work" className={styles.backLink}>&larr; Work</Link>
        </header>

        <div className={styles.sections}>
          {SECTIONS.map(section => (
            <AztecPanel key={section.category} family={section.family} title={section.title}>
              <p className={styles.sectionIntro}>{section.intro}</p>

              <div className={styles.list}>
                {byCategory[section.category].length === 0 && (
                  <div className={styles.empty}>Nothing here yet.</div>
                )}
                {byCategory[section.category].map(item => (
                  <div key={item.id} className={styles.item}>
                    <textarea
                      className={styles.itemText}
                      value={item.text}
                      rows={Math.max(2, Math.ceil(item.text.length / 70))}
                      onChange={e => handleLocalTextChange(item.id, e.target.value)}
                      onBlur={e => handleSaveText(item.id, e.target.value)}
                      disabled={savingId === item.id}
                    />
                    <button type="button" className={styles.deleteBtn} onClick={() => handleDelete(item.id)} title="Remove">
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.addRow}>
                <textarea
                  className={styles.addInput}
                  placeholder="Add a note..."
                  value={drafts[section.category]}
                  onChange={e => setDrafts(prev => ({ ...prev, [section.category]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAdd(section.category);
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => handleAdd(section.category)}
                  disabled={!drafts[section.category].trim()}
                >
                  Add
                </button>
              </div>
            </AztecPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
