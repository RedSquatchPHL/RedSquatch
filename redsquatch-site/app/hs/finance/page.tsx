'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { Plus, Pencil, Trash2, Check, X, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (date?: string): EntryDraft => ({
  title: '', category: '', notes: '', amount: '',
  entry_date: date ?? todayISO(),
});

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtAmount(val: string | null) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function buildCalendarDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
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

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form + edit state
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
      } catch { router.push('/login'); }
    })();
  }, [router]);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`${API}/api/client/finance?person=${selectedPerson}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setEntries(data.entries ?? []);
  }, [selectedPerson]);

  useEffect(() => { if (!loading) fetchEntries(); }, [loading, fetchEntries]);

  useEffect(() => {
    if (loading) return;
    fetch(`${API}/api/client/finance/categories?person=${selectedPerson}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const merged = Array.from(new Set([...SUGGESTED_CATEGORIES, ...(data.categories ?? [])])).sort();
        setAllCategories(merged);
      }).catch(() => {});
  }, [loading, selectedPerson, entries.length]);

  // Map: "YYYY-MM-DD" → entry count (for calendar dots)
  const entryCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const d = e.entry_date.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const calDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
      // If add form is open, sync its date
      if (showAddForm) setDraft(d => ({ ...d, entry_date: dateStr }));
    }
  };

  const openAddForm = () => {
    setShowAddForm(true);
    setDraft(emptyDraft(selectedDate ?? todayISO()));
  };

  const submitAdd = async () => {
    if (!draft.title.trim()) return;
    setSaving(true);
    const res = await fetch(`${API}/api/client/finance`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, person: selectedPerson }),
    });
    if (res.ok) {
      // Navigate calendar to the entry's month if needed
      const d = new Date(draft.entry_date + 'T12:00:00');
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
      setSelectedDate(draft.entry_date);
      setDraft(emptyDraft(draft.entry_date));
      setShowAddForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const startEdit = (e: FinanceEntry) => {
    setEditingId(e.id);
    setEditDraft({ title: e.title, category: e.category, notes: e.notes ?? '', amount: e.amount ?? '', entry_date: e.entry_date.slice(0, 10) });
  };

  const submitEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`${API}/api/client/finance/${editingId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) { setEditingId(null); fetchEntries(); }
    setSaving(false);
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`${API}/api/client/finance/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchEntries();
  };

  if (loading) return <PageLoader />;

  const today = todayISO();
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Ledger rows: if a date is selected, filter to that date; otherwise show all
  const ledgerEntries = selectedDate
    ? entries.filter(e => e.entry_date.slice(0, 10) === selectedDate)
    : entries;

  // Running total for visible ledger rows
  const ledgerTotal = ledgerEntries.reduce((sum, e) => {
    const n = parseFloat(e.amount ?? '0');
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>
              Finance
            </h1>
            <div className="flex gap-1">
              {PEOPLE.map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setSelectedPerson(key); setSelectedDate(null); }}
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
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CopperPanel>
      </div>

      {/* ── Calendar ── */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>
              <ChevronLeft size={18} />
            </button>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--rs-accent)' }}>
              {monthLabel}
            </span>
            <button onClick={nextMonth}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-xs font-mono py-1"
                style={{ color: 'rgba(var(--rs-accent-rgb),0.4)' }}>
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px" style={{ background: 'rgba(var(--rs-edge-rgb),0.08)' }}>
            {calDays.map((dateStr, i) => {
              if (!dateStr) {
                return (
                  <div key={`pad-${i}`}
                    className="min-h-[52px] p-1"
                    style={{ background: 'rgba(var(--rs-bg-rgb, 0,0,0),0.4)' }} />
                );
              }
              const count = entryCountByDate.get(dateStr) ?? 0;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const dayNum = parseInt(dateStr.slice(8), 10);

              return (
                <button key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className="min-h-[52px] p-1.5 flex flex-col items-start transition-colors relative"
                  style={{
                    background: isSelected
                      ? 'rgba(var(--rs-accent-rgb),0.18)'
                      : 'rgba(var(--rs-bg-rgb, 0,0,0),0.55)',
                    outline: isToday ? '1px solid rgba(var(--rs-accent-rgb),0.5)' : 'none',
                    outlineOffset: '-1px',
                  }}>
                  <span className="text-xs font-mono leading-none mb-1"
                    style={{
                      color: isSelected
                        ? 'var(--rs-accent)'
                        : isToday
                          ? 'var(--rs-accent)'
                          : 'rgba(var(--rs-accent-rgb),0.6)',
                      fontWeight: isToday || isSelected ? 700 : 400,
                    }}>
                    {dayNum}
                  </span>
                  {count > 0 && (
                    <div className="flex gap-0.5 flex-wrap mt-auto">
                      {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                        <span key={di}
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ background: 'var(--rs-accent)', opacity: 0.7 }} />
                      ))}
                      {count > 3 && (
                        <span className="text-[9px] font-mono leading-none"
                          style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
                          +{count - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <p className="mt-2 text-xs font-mono text-center"
              style={{ color: 'rgba(var(--rs-accent-rgb),0.45)' }}>
              Showing {fmtDate(selectedDate)} — <button
                onClick={() => setSelectedDate(null)}
                className="underline underline-offset-2 hover:opacity-80">
                clear
              </button>
            </p>
          )}
        </CopperPanel>
      </div>

      {/* ── Ledger ── */}
      <div className="w-full max-w-5xl space-y-3">

        {/* Ledger toolbar */}
        <div className="flex items-center gap-3 justify-between">
          <span className="text-sm font-mono" style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
            {selectedDate ? fmtDate(selectedDate) : 'All entries'} ({ledgerEntries.length})
            {ledgerTotal !== 0 && (
              <span className="ml-3" style={{ color: 'var(--rs-accent)' }}>
                {fmtAmount(String(ledgerTotal))}
              </span>
            )}
          </span>
          <button
            onClick={() => { openAddForm(); }}
            className="flex items-center gap-1 px-4 py-2 text-sm font-mono rounded transition-all"
            style={{
              background: 'rgba(var(--rs-accent-rgb),0.1)',
              border: '1px solid rgba(var(--rs-accent-rgb),0.4)',
              color: 'var(--rs-accent)',
            }}>
            <Plus size={14} /> Add Entry
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <CopperPanel>
            <div className="space-y-3">
              <p className="text-xs font-mono" style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>
                New entry — {selectedPerson === 'me' ? 'Me' : 'Denise'}
              </p>
              <datalist id="cat-list">
                {allCategories.map(c => <option key={c} value={c} />)}
              </datalist>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                  style={inputStyle} placeholder="Title *"
                  value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                />
                <input
                  list="cat-list"
                  className="w-full border px-2 py-1.5 text-sm rounded"
                  style={inputStyle} placeholder="Category"
                  value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input type="number" step="0.01"
                    className="border px-2 py-1.5 text-sm rounded w-36" style={inputStyle}
                    placeholder="Amount ($)"
                    value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))}
                  />
                  <input type="date"
                    className="border px-2 py-1.5 text-sm rounded flex-1" style={inputStyle}
                    value={draft.entry_date} onChange={e => setDraft(d => ({ ...d, entry_date: e.target.value }))}
                  />
                </div>
                <textarea
                  className="col-span-full w-full border px-2 py-1.5 text-sm rounded"
                  style={inputStyle} rows={2} placeholder="Notes (optional)"
                  value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddForm(false)}
                  className="px-3 py-1 text-sm font-mono rounded"
                  style={{ border: '1px solid rgba(var(--rs-accent-rgb),0.2)', color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
                  Cancel
                </button>
                <button onClick={submitAdd} disabled={saving || !draft.title.trim()}
                  className="flex items-center gap-1 px-4 py-1 text-sm font-mono rounded disabled:opacity-40"
                  style={{ background: 'rgba(var(--rs-accent-rgb),0.2)', border: '1px solid rgba(var(--rs-accent-rgb),0.5)', color: 'var(--rs-accent)' }}>
                  <Check size={14} /> Save
                </button>
              </div>
            </div>
          </CopperPanel>
        )}

        {/* Table */}
        {ledgerEntries.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'rgba(var(--rs-accent-rgb),0.35)' }}>
            <DollarSign size={32} className="mx-auto mb-2 opacity-25" />
            <p className="font-mono text-sm">
              {selectedDate ? 'No entries on this date.' : 'No entries yet. Use "Add Entry" to start tracking.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded"
            style={{ border: '1px solid rgba(var(--rs-edge-rgb),0.15)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.2)', background: 'rgba(var(--rs-accent-rgb),0.06)' }}>
                  {['Date', 'Title', 'Category', 'Amount', 'Notes', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-mono font-semibold"
                      style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => (
                  editingId === entry.id ? (
                    /* ── Edit row ── */
                    <tr key={entry.id}
                      style={{ background: 'rgba(var(--rs-accent-rgb),0.08)', borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
                      <td colSpan={6} className="px-3 py-3">
                        <datalist id="cat-list-edit">
                          {allCategories.map(c => <option key={c} value={c} />)}
                        </datalist>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                          <input type="date"
                            className="border px-2 py-1 text-sm rounded" style={inputStyle}
                            value={editDraft.entry_date} onChange={e => setEditDraft(d => ({ ...d, entry_date: e.target.value }))}
                          />
                          <input
                            className="border px-2 py-1 text-sm rounded sm:col-span-2" style={inputStyle}
                            placeholder="Title" value={editDraft.title}
                            onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                          />
                          <input list="cat-list-edit"
                            className="border px-2 py-1 text-sm rounded" style={inputStyle}
                            placeholder="Category" value={editDraft.category}
                            onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))}
                          />
                          <input type="number" step="0.01"
                            className="border px-2 py-1 text-sm rounded" style={inputStyle}
                            placeholder="Amount ($)" value={editDraft.amount}
                            onChange={e => setEditDraft(d => ({ ...d, amount: e.target.value }))}
                          />
                          <input
                            className="border px-2 py-1 text-sm rounded" style={inputStyle}
                            placeholder="Notes" value={editDraft.notes}
                            onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded"
                            style={{ border: '1px solid rgba(var(--rs-accent-rgb),0.2)', color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
                            <X size={11} /> Cancel
                          </button>
                          <button onClick={submitEdit} disabled={saving}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded disabled:opacity-40"
                            style={{ background: 'rgba(var(--rs-accent-rgb),0.2)', border: '1px solid rgba(var(--rs-accent-rgb),0.5)', color: 'var(--rs-accent)' }}>
                            <Check size={11} /> Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* ── Read row ── */
                    <tr key={entry.id}
                      className="group transition-colors"
                      style={{
                        background: idx % 2 === 0 ? 'rgba(var(--rs-accent-rgb),0.02)' : 'transparent',
                        borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.08)',
                      }}>
                      <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap"
                        style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}>
                        {fmtDate(entry.entry_date)}
                      </td>
                      <td className="px-3 py-2.5 font-medium"
                        style={{ color: 'var(--rs-text, rgba(255,255,255,0.88))' }}>
                        {entry.title}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{
                            background: 'rgba(var(--rs-accent-rgb),0.1)',
                            border: '1px solid rgba(var(--rs-accent-rgb),0.2)',
                            color: 'rgba(var(--rs-accent-rgb),0.75)',
                          }}>
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap"
                        style={{ color: entry.amount ? 'var(--rs-accent)' : 'rgba(var(--rs-accent-rgb),0.2)' }}>
                        {fmtAmount(entry.amount) ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        {entry.notes && (
                          <span className="text-xs truncate block"
                            style={{ color: 'rgba(var(--rs-accent-rgb),0.45)' }}>
                            {entry.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={() => startEdit(entry)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }} title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteEntry(entry.id)}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                            style={{ color: 'rgba(var(--rs-accent-rgb),0.4)' }} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
              {ledgerTotal !== 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(var(--rs-edge-rgb),0.2)', background: 'rgba(var(--rs-accent-rgb),0.04)' }}>
                    <td colSpan={3} className="px-3 py-2 text-xs font-mono"
                      style={{ color: 'rgba(var(--rs-accent-rgb),0.4)' }}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold"
                      style={{ color: 'var(--rs-accent)' }}>
                      {fmtAmount(String(ledgerTotal))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
