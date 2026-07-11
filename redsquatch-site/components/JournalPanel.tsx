'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import type { WorkGroupOption } from '@/components/WorkItemsTable';

export type JournalEntry = {
  id: number;
  work_item_id: number;
  session_date: string;
  session_start: string | null;
  session_end: string | null;
  why: string | null;
  what: string | null;
  how: string | null;
  session_status: JournalStatus;
  blockers: string | null;
  next: string | null;
  created_at: string;
  updated_at: string;
};

type JournalStatus = 'Starting' | '25%' | '50%' | '75%' | 'Done';
const STATUSES: JournalStatus[] = ['Starting', '25%', '50%', '75%', 'Done'];

type Draft = {
  session_date: string;
  session_start: string;
  session_end: string;
  why: string;
  what: string;
  how: string;
  session_status: JournalStatus;
  blockers: string;
  next: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankDraft(): Draft {
  return {
    session_date: today(),
    session_start: '',
    session_end: '',
    why: '',
    what: '',
    how: '',
    session_status: 'Starting',
    blockers: '',
    next: '',
  };
}

function toDraft(entry: JournalEntry): Draft {
  return {
    session_date: entry.session_date?.slice(0, 10) ?? today(),
    session_start: entry.session_start ?? '',
    session_end: entry.session_end ?? '',
    why: entry.why ?? '',
    what: entry.what ?? '',
    how: entry.how ?? '',
    session_status: entry.session_status,
    blockers: entry.blockers ?? '',
    next: entry.next ?? '',
  };
}

const inputClass =
  'w-full bg-transparent border-0 border-b border-[rgba(184,115,51,0.25)] text-white px-0 py-1.5 ' +
  'focus:outline-none focus:border-[#d4a373]';
const textareaClass = `${inputClass} resize-none`;

export default function JournalPanel({
  workItemId,
  workItemLabel,
  groups,
  onClose,
}: {
  workItemId: number;
  workItemLabel: string;
  groups: WorkGroupOption[];
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft());
  const [groupPickerFor, setGroupPickerFor] = useState<number | null>(null);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/work-items/${workItemId}/journal`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load journal entries');
      const data: JournalEntry[] = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditingId(null);
    setDraft(blankDraft());
    loadEntries();
  }, [workItemId]);

  function startNew() {
    setEditingId(null);
    setDraft(blankDraft());
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setDraft(toDraft(entry));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = editingId
        ? `${API}/api/client/journal/${editingId}`
        : `${API}/api/client/work-items/${workItemId}/journal`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error('Failed to save journal entry');
      const saved: JournalEntry = await res.json();
      setEditingId(saved.id);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddToGroup(entryId: number, groupId: number) {
    try {
      const res = await fetch(`${API}/api/client/journal/${entryId}/add-to-group`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId }),
      });
      if (!res.ok) throw new Error('Failed to add entry to group');
      setGroupPickerFor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry to group');
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-[rgba(184,115,51,0.25)] bg-[rgba(15,15,15,0.6)] w-full md:w-[420px] shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(184,115,51,0.25)]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#d4a373]">Journal</h3>
          <p className="text-xs text-white/40 mt-0.5">{workItemLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-2 py-1"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {error && (
          <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2">{error}</p>
        )}

        {/* Entry form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#d4a373]">{editingId ? 'Editing entry' : 'New entry'}</span>
            {editingId && (
              <button type="button" onClick={startNew} className="text-xs text-white/40 hover:text-white/70">
                + New instead
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#d4a373]">Date</label>
              <input
                type="date"
                value={draft.session_date}
                onChange={e => setDraft(d => ({ ...d, session_date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#d4a373]">Start</label>
              <input
                type="time"
                value={draft.session_start}
                onChange={e => setDraft(d => ({ ...d, session_start: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#d4a373]">End</label>
              <input
                type="time"
                value={draft.session_end}
                onChange={e => setDraft(d => ({ ...d, session_end: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#d4a373]">Status</label>
            <select
              value={draft.session_status}
              onChange={e => setDraft(d => ({ ...d, session_status: e.target.value as JournalStatus }))}
              className="bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#d4a373] w-full"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {([
            ['why', 'Why', 2],
            ['what', 'What', 3],
            ['how', 'How', 3],
            ['blockers', 'Blockers', 2],
            ['next', 'Next', 2],
          ] as const).map(([key, label, rows]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-[#d4a373]">{label}</label>
              <textarea
                value={draft[key]}
                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                rows={rows}
                className={textareaClass}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full text-sm bg-[#b87333] hover:bg-[#b87333]/80 text-[#0f0f0f] font-semibold px-4 py-2 disabled:opacity-40"
          >
            {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>

        {/* History */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase tracking-wider text-[#d4a373]">History</h4>
          {loading && <p className="text-xs text-white/40">Loading...</p>}
          {!loading && entries.length === 0 && (
            <p className="text-xs text-white/40">No journal entries yet.</p>
          )}
          {entries.map(entry => (
            <div key={entry.id} className="border border-[rgba(184,115,51,0.2)] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  className="text-xs text-[#d4a373] hover:underline"
                >
                  {entry.session_date} — {entry.session_status}
                </button>
                {groups.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setGroupPickerFor(groupPickerFor === entry.id ? null : entry.id)}
                      className="text-xs border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-2 py-0.5"
                    >
                      + Add to group
                    </button>
                    {groupPickerFor === entry.id && (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={e => e.target.value && handleAddToGroup(entry.id, Number(e.target.value))}
                        className="absolute right-0 mt-1 bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white text-xs px-2 py-1 z-10"
                      >
                        <option value="" disabled>Select group...</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              {entry.why && <p className="text-xs text-white/60 line-clamp-2">{entry.why}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
