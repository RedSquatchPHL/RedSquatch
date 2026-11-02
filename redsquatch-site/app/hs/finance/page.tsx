'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { Plus, Pencil, Trash2, Check, X, DollarSign, Tag } from 'lucide-react';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';
import type React from 'react';

type Person = 'me' | 'denise';

const PEOPLE: { key: Person; label: string }[] = [
  { key: 'me', label: 'Me' },
  { key: 'denise', label: 'Denise' },
];

const SUGGESTED_CATEGORIES = [
  'Income', 'Commission', 'Expenses', 'Mileage', 'Travel',
  'Software', 'Marketing', 'Office', '1099', 'Tax Document',
  'Receipt', 'Invoice', 'Other',
];

interface FinanceEntry {
  id: number;
  person: Person;
  title: string;
  category: string;
  notes: string | null;
  amount: string | null;
  entry_date: string;
  created_at: string;
}

interface EntryDraft {
  title: string;
  category: string;
  notes: string;
  amount: string;
  entry_date: string;
}

const emptyDraft = (): EntryDraft => ({
  title: '',
  category: '',
  notes: '',
  amount: '',
  entry_date: new Date().toISOString().slice(0, 10),
});

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtAmount(val: string | null) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const inputStyle: React.CSSProperties = {
  borderColor: 'rgba(var(--rs-edge-rgb),0.3)',
  color: 'var(--rs-accent)',
  background: 'transparent',
};

export default function HSFinancePage() {
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person>('denise');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EntryDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>(SUGGESTED_CATEGORIES);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`${API}/api/client/finance?person=${selectedPerson}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setEntries(data.entries ?? []);
  }, [selectedPerson]);

  useEffect(() => {
    if (!loading) fetchEntries();
  }, [loading, fetchEntries]);

  useEffect(() => {
    if (loading) return;
    // Merge DB categories with suggestions so user-entered ones appear in the dropdown
    fetch(`${API}/api/client/finance/categories?person=${selectedPerson}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const merged = Array.from(new Set([...SUGGESTED_CATEGORIES, ...(data.categories ?? [])])).sort();
        setAllCategories(merged);
      })
      .catch(() => {});
  }, [loading, selectedPerson, entries.length]);

  const submitAdd = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    const res = await fetch(`${API}/api/client/finance`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, person: selectedPerson }),
    });
    if (res.ok) {
      setDraft(emptyDraft());
      setShowAddForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const startEdit = (e: FinanceEntry) => {
    setEditingId(e.id);
    setEditDraft({
      title: e.title,
      category: e.category,
      notes: e.notes ?? '',
      amount: e.amount ?? '',
      entry_date: e.entry_date.slice(0, 10),
    });
  };

  const submitEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`${API}/api/client/finance/${editingId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      setEditingId(null);
      fetchEntries();
    }
    setSaving(false);
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`${API}/api/client/finance/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchEntries();
  };

  if (loading) return <PageLoader />;

  const visible = filterCategory
    ? entries.filter(e => e.category === filterCategory)
    : entries;

  const usedCategories = Array.from(new Set(entries.map(e => e.category))).sort();

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-6 space-y-6">

      {/* Header with profile switcher */}
      <div className="w-full max-w-4xl">
        <CopperPanel>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>
              Finance
            </h1>
            <div className="flex gap-1">
              {PEOPLE.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setSelectedPerson(key); setFilterCategory(null); }}
                  className="px-3 py-1 text-sm font-mono rounded transition-all duration-200"
                  style={selectedPerson === key ? {
                    background: 'rgba(var(--rs-accent-rgb),0.2)',
                    border: '1px solid rgba(var(--rs-accent-rgb),0.6)',
                    color: 'var(--rs-accent)',
                    textShadow: '0 0 8px rgba(var(--rs-accent-rgb),0.4)',
                  } : {
                    background: 'transparent',
                    border: '1px solid rgba(var(--rs-accent-rgb),0.2)',
                    color: 'rgba(var(--rs-accent-rgb),0.5)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CopperPanel>
      </div>

      {/* Toolbar: category filters + add button */}
      <div className="w-full max-w-4xl flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilterCategory(null)}
          className="px-3 py-1 text-xs font-mono rounded transition-all"
          style={!filterCategory ? {
            background: 'rgba(var(--rs-accent-rgb),0.2)',
            border: '1px solid rgba(var(--rs-accent-rgb),0.5)',
            color: 'var(--rs-accent)',
          } : {
            background: 'transparent',
            border: '1px solid rgba(var(--rs-accent-rgb),0.2)',
            color: 'rgba(var(--rs-accent-rgb),0.5)',
          }}
        >
          All ({entries.length})
        </button>
        {usedCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
            className="px-3 py-1 text-xs font-mono rounded transition-all"
            style={filterCategory === cat ? {
              background: 'rgba(var(--rs-accent-rgb),0.2)',
              border: '1px solid rgba(var(--rs-accent-rgb),0.5)',
              color: 'var(--rs-accent)',
            } : {
              background: 'transparent',
              border: '1px solid rgba(var(--rs-accent-rgb),0.2)',
              color: 'rgba(var(--rs-accent-rgb),0.5)',
            }}
          >
            <Tag size={10} className="inline mr-1" />
            {cat}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => { setShowAddForm(v => !v); setDraft(emptyDraft()); }}
            className="flex items-center gap-1 px-4 py-2 text-sm font-mono rounded transition-all"
            style={{
              background: showAddForm ? 'rgba(var(--rs-accent-rgb),0.15)' : 'rgba(var(--rs-accent-rgb),0.1)',
              border: '1px solid rgba(var(--rs-accent-rgb),0.4)',
              color: 'var(--rs-accent)',
            }}
          >
            <Plus size={14} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Add form (collapsible) */}
      {showAddForm && (
        <div className="w-full max-w-4xl">
          <CopperPanel>
            <div className="space-y-3">
              <p className="text-xs font-mono" style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>
                New entry for {selectedPerson === 'me' ? 'Me' : 'Denise'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                  style={inputStyle}
                  placeholder="Title *"
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input
                    list="category-suggestions"
                    className="w-full border px-2 py-1.5 text-sm rounded flex-1"
                    style={inputStyle}
                    placeholder="Category"
                    value={draft.category}
                    onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                  />
                  <datalist id="category-suggestions">
                    {allCategories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    className="border px-2 py-1.5 text-sm rounded w-36"
                    style={inputStyle}
                    placeholder="Amount ($)"
                    value={draft.amount}
                    onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="border px-2 py-1.5 text-sm rounded flex-1"
                    style={inputStyle}
                    value={draft.entry_date}
                    onChange={e => setDraft(d => ({ ...d, entry_date: e.target.value }))}
                  />
                </div>
                <textarea
                  className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                  style={inputStyle}
                  rows={3}
                  placeholder="Notes (optional)"
                  value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-sm font-mono rounded"
                  style={{ border: '1px solid rgba(var(--rs-accent-rgb),0.2)', color: 'rgba(var(--rs-accent-rgb),0.5)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitAdd}
                  disabled={saving || !draft.title.trim()}
                  className="flex items-center gap-1 px-4 py-1 text-sm font-mono rounded transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(var(--rs-accent-rgb),0.2)',
                    border: '1px solid rgba(var(--rs-accent-rgb),0.5)',
                    color: 'var(--rs-accent)',
                  }}
                >
                  <Check size={14} /> Save
                </button>
              </div>
            </div>
          </CopperPanel>
        </div>
      )}

      {/* Entry list */}
      <div className="w-full max-w-4xl space-y-2">
        {visible.length === 0 && (
          <div className="text-center py-16" style={{ color: 'rgba(var(--rs-accent-rgb),0.4)' }}>
            <DollarSign size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-mono text-sm">No entries yet. Use "Add Entry" to start tracking.</p>
          </div>
        )}

        {visible.map(entry => (
          <div key={entry.id}>
            {editingId === entry.id ? (
              /* Inline edit row */
              <CopperPanel>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                      style={inputStyle}
                      value={editDraft.title}
                      onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <input
                        list="category-suggestions"
                        className="w-full border px-2 py-1.5 text-sm rounded flex-1"
                        style={inputStyle}
                        placeholder="Category"
                        value={editDraft.category}
                        onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        className="border px-2 py-1.5 text-sm rounded w-36"
                        style={inputStyle}
                        placeholder="Amount ($)"
                        value={editDraft.amount}
                        onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))}
                      />
                      <input
                        type="date"
                        className="border px-2 py-1.5 text-sm rounded flex-1"
                        style={inputStyle}
                        value={editDraft.entry_date}
                        onChange={e => setEditDraft(d => ({ ...d, entry_date: e.target.value }))}
                      />
                    </div>
                    <textarea
                      className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                      style={inputStyle}
                      rows={3}
                      placeholder="Notes (optional)"
                      value={editDraft.notes}
                      onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1 text-sm font-mono rounded"
                      style={{ border: '1px solid rgba(var(--rs-accent-rgb),0.2)', color: 'rgba(var(--rs-accent-rgb),0.5)' }}
                    >
                      <X size={12} /> Cancel
                    </button>
                    <button
                      onClick={submitEdit}
                      disabled={saving}
                      className="flex items-center gap-1 px-4 py-1 text-sm font-mono rounded disabled:opacity-40"
                      style={{
                        background: 'rgba(var(--rs-accent-rgb),0.2)',
                        border: '1px solid rgba(var(--rs-accent-rgb),0.5)',
                        color: 'var(--rs-accent)',
                      }}
                    >
                      <Check size={12} /> Save
                    </button>
                  </div>
                </div>
              </CopperPanel>
            ) : (
              /* Read-only row */
              <div
                className="group flex items-start gap-4 px-4 py-3 rounded transition-all"
                style={{
                  background: 'rgba(var(--rs-accent-rgb),0.03)',
                  border: '1px solid rgba(var(--rs-accent-rgb),0.1)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate" style={{ color: 'var(--rs-text, rgba(255,255,255,0.9))' }}>
                      {entry.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono shrink-0"
                      style={{
                        background: 'rgba(var(--rs-accent-rgb),0.12)',
                        border: '1px solid rgba(var(--rs-accent-rgb),0.25)',
                        color: 'rgba(var(--rs-accent-rgb),0.8)',
                      }}
                    >
                      {entry.category}
                    </span>
                    {entry.amount && (
                      <span className="text-sm font-mono shrink-0" style={{ color: 'var(--rs-accent)' }}>
                        {fmtAmount(entry.amount)}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="mt-1 text-sm" style={{ color: 'rgba(var(--rs-accent-rgb),0.55)' }}>
                      {entry.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-mono" style={{ color: 'rgba(var(--rs-accent-rgb),0.35)' }}>
                    {fmtDate(entry.entry_date)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                    style={{ color: 'rgba(var(--rs-accent-rgb),0.4)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
