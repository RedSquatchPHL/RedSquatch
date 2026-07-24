'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import type { WorkCard } from '@/components/WorkCard';
import styles from '@/styles/work.module.css';

type JournalEntry = {
  id: number;
  work_card_id: number;
  note: string;
  created_at: string;
};

export default function WorkCardJournalPanel({
  card,
  onClose,
}: {
  card: WorkCard;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/client/work-cards/${card.id}/journal`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, [card.id]);

  async function handleAddNote() {
    const note = draft.trim();
    if (!note) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/client/work-cards/${card.id}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        const entry = await res.json();
        setEntries(prev => [entry, ...prev]);
        setDraft('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.journalPanel}>
      <div className={styles.journalHeader}>
        <div>
          <div className={styles.mono}>{card.ticket_number}</div>
          <div className={styles.journalSubtitle}>{card.short_description}</div>
        </div>
        <button type="button" className={styles.dismissBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.journalCompose}>
        <textarea
          className={styles.journalTextarea}
          placeholder="Quick note on next steps…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <button
          type="button"
          className={styles.toggleBtn}
          disabled={saving || draft.trim() === ''}
          onClick={handleAddNote}
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>

      <div className={styles.journalList}>
        {loading ? (
          <p className={styles.backburnerEmpty}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className={styles.backburnerEmpty}>No notes yet.</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className={styles.journalEntry}>
              <div className={styles.journalEntryDate}>{new Date(entry.created_at).toLocaleString()}</div>
              <p className={styles.journalEntryNote}>{entry.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
