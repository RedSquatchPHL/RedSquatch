'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API } from '@/lib/api';

type Position = 'sitting' | 'lying_down' | 'standing';
type Arm = 'upper_left' | 'upper_right' | 'left_forearm' | 'right_forearm';

interface Reading {
  id: number;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  position: Position;
  arm: Arm;
  reading_at: string;
}

const POSITION_LABEL: Record<Position, string> = {
  sitting: 'Sitting',
  lying_down: 'Lying Down',
  standing: 'Standing',
};

const ARM_LABEL: Record<Arm, string> = {
  upper_left: 'Upper Left',
  upper_right: 'Upper Right',
  left_forearm: 'Left Forearm',
  right_forearm: 'Right Forearm',
};

// Standard AHA categories — purely derived from systolic/diastolic, no extra
// data entry, same spirit as the Tirzepatide tracker's cost-per-mg column.
type Category = 'Normal' | 'Elevated' | 'High (Stage 1)' | 'High (Stage 2)' | 'Hypertensive Crisis';

function getCategory(systolic: number, diastolic: number): { label: Category; color: string } {
  if (systolic > 180 || diastolic > 120) return { label: 'Hypertensive Crisis', color: '#c85050' };
  if (systolic >= 140 || diastolic >= 90) return { label: 'High (Stage 2)', color: '#d97a5c' };
  if (systolic >= 130 || diastolic >= 80) return { label: 'High (Stage 1)', color: '#d9a036' };
  if (systolic >= 120) return { label: 'Elevated', color: '#d4a373' };
  return { label: 'Normal', color: '#4caf50' };
}

function toLocalDatetimeInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = {
  systolic: '',
  diastolic: '',
  heart_rate: '',
  position: 'sitting' as Position,
  arm: 'upper_left' as Arm,
  reading_at: toLocalDatetimeInputValue(new Date().toISOString()),
};

type FormState = typeof emptyForm;

function toFormState(r: Reading): FormState {
  return {
    systolic: String(r.systolic),
    diastolic: String(r.diastolic),
    heart_rate: r.heart_rate != null ? String(r.heart_rate) : '',
    position: r.position,
    arm: r.arm,
    reading_at: toLocalDatetimeInputValue(r.reading_at),
  };
}

function formToPayload(f: FormState): Record<string, unknown> | null {
  // Number('') and Number('  ') both coerce to 0, which IS an integer — without
  // this guard a blank field silently becomes a "valid" 0 and only fails later,
  // server-side, on the 40-300/20-200 range check. Heart rate has no such guard:
  // it's optional (backfilled historical readings often predate owning a pulse
  // cuff), so a blank field there deliberately maps to null, not a validation error.
  if (!f.systolic.trim() || !f.diastolic.trim()) return null;
  const systolic = Number(f.systolic);
  const diastolic = Number(f.diastolic);
  if (!Number.isInteger(systolic) || !Number.isInteger(diastolic)) return null;

  let heart_rate: number | null = null;
  if (f.heart_rate.trim()) {
    heart_rate = Number(f.heart_rate);
    if (!Number.isInteger(heart_rate)) return null;
  }

  return {
    systolic,
    diastolic,
    heart_rate,
    position: f.position,
    arm: f.arm,
    // datetime-local has no timezone — read as local time, same as the input displayed it.
    reading_at: new Date(f.reading_at).toISOString(),
  };
}

const inputStyle: React.CSSProperties = {
  borderColor: 'rgba(var(--copper-bold-rgb),0.3)',
  color: 'var(--copper-tan)',
  background: 'transparent',
};

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === 'string') return data.error;
  } catch {
    // non-JSON body (e.g. a proxy error page) — fall through to the generic message
  }
  return 'Failed to save — check your connection.';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function BloodPressureTracker() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/blood-pressure`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setReadings(data.readings ?? []);
      } catch {
        setError('Could not load your readings — check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(
    () => [...readings].sort((a, b) => new Date(b.reading_at).getTime() - new Date(a.reading_at).getTime()),
    [readings]
  );

  function flash(msg: string) {
    setConfirmMsg(msg);
    setTimeout(() => setConfirmMsg(null), 3000);
  }

  function startAdd() {
    setEditingId(null);
    setForm({ ...emptyForm, reading_at: toLocalDatetimeInputValue(new Date().toISOString()) });
    setShowForm(true);
  }

  function startEdit(r: Reading) {
    setEditingId(r.id);
    setForm(toFormState(r));
    setShowForm(true);
  }

  async function saveForm() {
    const payload = formToPayload(form);
    if (!payload) {
      flash('Systolic and diastolic are required and, along with heart rate (if entered), must be whole numbers.');
      return;
    }
    try {
      if (editingId === null) {
        const res = await fetch(`${API}/api/client/blood-pressure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await errorMessage(res));
        const created = await res.json();
        setReadings(prev => [...prev, created]);
        flash('Reading added.');
      } else {
        const res = await fetch(`${API}/api/client/blood-pressure/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await errorMessage(res));
        const updated = await res.json();
        setReadings(prev => prev.map(r => (r.id === editingId ? updated : r)));
        flash('Reading updated.');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to save — check your connection.');
    }
  }

  async function deleteReading(r: Reading) {
    if (!confirm(`Remove the ${r.systolic}/${r.diastolic} reading from ${formatDateTime(r.reading_at)}?`)) return;
    try {
      const res = await fetch(`${API}/api/client/blood-pressure/${r.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('delete failed');
      setReadings(prev => prev.filter(x => x.id !== r.id));
      flash('Reading removed.');
    } catch {
      flash('Failed to delete — check your connection.');
    }
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Blood Pressure Log', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Date/Time', 'Systolic', 'Diastolic', 'Heart Rate', 'Position', 'Arm', 'Category']],
      body: sorted.map(r => {
        const cat = getCategory(r.systolic, r.diastolic);
        return [
          formatDateTime(r.reading_at),
          String(r.systolic),
          String(r.diastolic),
          r.heart_rate != null ? String(r.heart_rate) : '—',
          POSITION_LABEL[r.position],
          ARM_LABEL[r.arm],
          cat.label,
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [184, 115, 51] },
    });

    doc.save(`blood-pressure-log-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  if (loading) {
    return <div className="py-12 text-center" style={{ color: 'var(--copper-tan)' }}>Loading…</div>;
  }

  return (
    <div style={{ color: 'var(--copper-tan)' }}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--copper-tan)', textShadow: '0 0 16px rgba(var(--copper-bold-rgb),0.3)' }}>
            Blood Pressure Log
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }}>
            Track systolic/diastolic, heart rate, position, and cuff placement over time
          </p>
          {error && <p className="text-xs mt-1 text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {readings.length > 0 && (
            <button
              type="button"
              onClick={exportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border"
              style={{ borderColor: 'rgba(var(--copper-bold-rgb),0.3)', color: 'var(--copper-tan)' }}
            >
              <FileDown size={14} /> Export PDF
            </button>
          )}
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
            style={{ background: 'var(--copper-bold)', color: 'var(--stone-0)' }}
          >
            <Plus size={14} /> Add Reading
          </button>
        </div>
      </div>

      {readings.length === 0 && !showForm && (
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>
          No readings logged yet. Click &quot;Add Reading&quot; to start tracking.
        </div>
      )}

      {readings.length > 0 && (
        <div className="overflow-x-auto rounded-md" style={{ background: 'rgba(20,18,16,0.6)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(var(--copper-bold-rgb),0.2)' }}>
                <th className="text-left px-3 py-2">Date/Time</th>
                <th className="text-left px-3 py-2">BP</th>
                <th className="text-left px-3 py-2">Heart Rate</th>
                <th className="text-left px-3 py-2">Position</th>
                <th className="text-left px-3 py-2">Arm</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const cat = getCategory(r.systolic, r.diastolic);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.1)' }}>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.reading_at)}</td>
                    <td className="px-3 py-2 font-semibold">{r.systolic}/{r.diastolic}</td>
                    <td className="px-3 py-2">{r.heart_rate != null ? `${r.heart_rate} bpm` : '—'}</td>
                    <td className="px-3 py-2">{POSITION_LABEL[r.position]}</td>
                    <td className="px-3 py-2">{ARM_LABEL[r.arm]}</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                        style={{ background: `${cat.color}2e`, color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => startEdit(r)} title="Edit">
                          <Pencil size={13} style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }} />
                        </button>
                        <button type="button" onClick={() => deleteReading(r)} title="Delete">
                          <Trash2 size={13} style={{ color: '#c85050' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="rounded-md p-4 mt-4 space-y-3" style={{ background: 'rgba(20,18,16,0.6)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--copper-tan)' }}>
            {editingId === null ? 'Add a Reading' : 'Edit Reading'}
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Systolic</label>
              <input value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))} placeholder="e.g. 120" inputMode="numeric" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Diastolic</label>
              <input value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))} placeholder="e.g. 80" inputMode="numeric" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Heart Rate (optional)</label>
              <input value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))} placeholder="e.g. 70" inputMode="numeric" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Position</label>
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as Position }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                {Object.entries(POSITION_LABEL).map(([v, label]) => (
                  <option key={v} value={v} style={{ color: '#000' }}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Arm</label>
              <select value={form.arm} onChange={e => setForm(f => ({ ...f, arm: e.target.value as Arm }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                {Object.entries(ARM_LABEL).map(([v, label]) => (
                  <option key={v} value={v} style={{ color: '#000' }}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Date/Time</label>
            <input
              type="datetime-local"
              value={form.reading_at}
              onChange={e => setForm(f => ({ ...f, reading_at: e.target.value }))}
              className="w-full border px-2 py-1.5 text-sm rounded"
              style={inputStyle}
            />
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={saveForm} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--copper-bold)', color: 'var(--stone-0)' }}>
              {editingId === null ? 'Add Reading' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-md text-sm font-semibold border"
              style={{ borderColor: 'rgba(var(--copper-bold-rgb),0.3)', color: 'var(--copper-tan)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmMsg && (
        <div className="mt-3 text-xs rounded-md p-2" style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50' }}>
          {confirmMsg}
        </div>
      )}
    </div>
  );
}
