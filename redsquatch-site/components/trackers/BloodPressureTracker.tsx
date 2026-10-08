'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, FileDown, ChevronDown, ChevronRight, Check, X, Lock, Unlock, BarChart2, TrendingUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { API } from '@/lib/api';

type Position = 'sitting' | 'lying_down' | 'standing';
type Arm = 'upper_left' | 'upper_right' | 'left_forearm' | 'right_forearm';
type Medication = 'amlodipine_5mg' | 'amlodipine_10mg';

interface Reading {
  id: number;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  position: Position;
  arm: Arm;
  medication: Medication | null;
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

const MEDICATION_LABEL: Record<Medication, string> = {
  amlodipine_5mg: 'Amlodipine 5mg',
  amlodipine_10mg: 'Amlodipine 10mg',
};

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
  medication: '' as Medication | '',
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
    medication: r.medication ?? '',
    reading_at: toLocalDatetimeInputValue(r.reading_at),
  };
}

function formToPayload(f: FormState): Record<string, unknown> | null {
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
    medication: f.medication || null,
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
    // non-JSON body — fall through
  }
  return 'Failed to save — check your connection.';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelOf(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function weekKeyOf(d: Date): string {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

function weekLabelOf(weekKey: string): string {
  const [y, m, day] = weekKey.split('-').map(Number);
  const start = new Date(y, m - 1, day);
  return `Week of ${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

interface WeekGroup { key: string; label: string; readings: Reading[] }
interface MonthGroup { key: string; label: string; weeks: WeekGroup[] }

function groupByMonthAndWeek(rows: Reading[]): MonthGroup[] {
  const months = new Map<string, Map<string, Reading[]>>();
  for (const r of rows) {
    const d = new Date(r.reading_at);
    const mKey = monthKeyOf(d);
    const wKey = weekKeyOf(d);
    if (!months.has(mKey)) months.set(mKey, new Map());
    const weeks = months.get(mKey)!;
    if (!weeks.has(wKey)) weeks.set(wKey, []);
    weeks.get(wKey)!.push(r);
  }
  return Array.from(months.entries()).map(([mKey, weeks]) => ({
    key: mKey,
    label: monthLabelOf(mKey),
    weeks: Array.from(weeks.entries()).map(([wKey, readings]) => ({
      key: wKey,
      label: weekLabelOf(wKey),
      readings,
    })),
  }));
}

// ── Chart ─────────────────────────────────────────────────────────────────────

type ChartType = 'line' | 'bar';

interface ChartPoint {
  label: string;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
}

function BPChart({ readings }: { readings: Reading[] }) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showHR, setShowHR] = useState(false);

  // Oldest-first for the chart x-axis
  const data: ChartPoint[] = useMemo(
    () =>
      [...readings]
        .sort((a, b) => new Date(a.reading_at).getTime() - new Date(b.reading_at).getTime())
        .map(r => ({
          label: formatDateShort(r.reading_at),
          systolic: r.systolic,
          diastolic: r.diastolic,
          heart_rate: r.heart_rate,
        })),
    [readings]
  );

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
  };
  const activeBtn: React.CSSProperties = {
    ...btnBase,
    background: 'var(--copper-bold)',
    borderColor: 'var(--copper-bold)',
    color: 'var(--stone-0)',
  };
  const inactiveBtn: React.CSSProperties = {
    ...btnBase,
    background: 'transparent',
    borderColor: 'rgba(var(--copper-bold-rgb),0.3)',
    color: 'var(--copper-tan)',
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(20,18,16,0.95)',
    border: '1px solid rgba(184,115,51,0.3)',
    borderRadius: '6px',
    color: 'var(--copper-tan)',
    fontSize: '12px',
  };

  const axisStyle = { fill: 'rgba(212,163,115,0.5)', fontSize: 11 };
  const gridStyle = { stroke: 'rgba(184,115,51,0.1)' };

  const sharedProps = {
    data,
    margin: { top: 8, right: 16, left: 0, bottom: 0 },
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Chart controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--copper-tan)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          BP Over Time
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button style={chartType === 'line' ? activeBtn : inactiveBtn} onClick={() => setChartType('line')}>
            <TrendingUp size={12} /> Line
          </button>
          <button style={chartType === 'bar' ? activeBtn : inactiveBtn} onClick={() => setChartType('bar')}>
            <BarChart2 size={12} /> Bar
          </button>
          <button
            style={{ ...inactiveBtn, borderColor: showHR ? '#4caf5088' : 'rgba(var(--copper-bold-rgb),0.3)', color: showHR ? '#4caf50' : 'var(--copper-tan)' }}
            onClick={() => setShowHR(h => !h)}
          >
            HR
          </button>
        </div>
      </div>

      <div style={{ borderRadius: '8px', padding: '12px 4px 4px', background: 'rgba(20,18,16,0.6)', overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height={220}>
          {chartType === 'line' ? (
            <LineChart {...sharedProps}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(212,163,115,0.7)', marginBottom: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(212,163,115,0.7)' }} />
              <Line type="monotone" dataKey="systolic" stroke="#c85050" strokeWidth={2} dot={{ r: 3, fill: '#c85050' }} activeDot={{ r: 5 }} name="Systolic" />
              <Line type="monotone" dataKey="diastolic" stroke="#b87333" strokeWidth={2} dot={{ r: 3, fill: '#b87333' }} activeDot={{ r: 5 }} name="Diastolic" />
              {showHR && <Line type="monotone" dataKey="heart_rate" stroke="#4caf50" strokeWidth={2} dot={{ r: 3, fill: '#4caf50' }} activeDot={{ r: 5 }} name="Heart Rate" connectNulls />}
            </LineChart>
          ) : (
            <BarChart {...sharedProps} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'rgba(212,163,115,0.7)', marginBottom: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(212,163,115,0.7)' }} />
              <Bar dataKey="systolic" fill="#c85050" radius={[3, 3, 0, 0]} name="Systolic" />
              <Bar dataKey="diastolic" fill="#b87333" radius={[3, 3, 0, 0]} name="Diastolic" />
              {showHR && <Bar dataKey="heart_rate" fill="#4caf50" radius={[3, 3, 0, 0]} name="Heart Rate" />}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BloodPressureTracker() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/blood-pressure`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const fetched: Reading[] = data.readings ?? [];
        setReadings(fetched);
        const monthKeys = Array.from(new Set(fetched.map(r => monthKeyOf(new Date(r.reading_at)))));
        setCollapsedMonths(new Set(monthKeys.slice(1)));
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

  const monthGroups = useMemo(() => groupByMonthAndWeek(sorted), [sorted]);

  function toggleMonth(key: string) {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleWeek(key: string) {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function ensureExpanded(r: Reading) {
    const d = new Date(r.reading_at);
    const mKey = monthKeyOf(d);
    const wKey = weekKeyOf(d);
    setCollapsedMonths(prev => {
      if (!prev.has(mKey)) return prev;
      const next = new Set(prev); next.delete(mKey); return next;
    });
    setCollapsedWeeks(prev => {
      if (!prev.has(wKey)) return prev;
      const next = new Set(prev); next.delete(wKey); return next;
    });
  }

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
    setShowForm(false);
    setEditingId(r.id);
    setForm(toFormState(r));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleLock() {
    if (!locked) cancelEdit();
    setLocked(prev => !prev);
  }

  async function saveForm() {
    const payload = formToPayload(form);
    if (!payload) {
      flash('Systolic and diastolic are required and must be whole numbers.');
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
        ensureExpanded(created);
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
        ensureExpanded(updated);
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
      head: [['Date/Time', 'Systolic', 'Diastolic', 'Heart Rate', 'Position', 'Arm', 'Medication', 'Category']],
      body: sorted.map(r => {
        const cat = getCategory(r.systolic, r.diastolic);
        return [
          formatDateTime(r.reading_at),
          String(r.systolic),
          String(r.diastolic),
          r.heart_rate != null ? String(r.heart_rate) : '—',
          POSITION_LABEL[r.position],
          ARM_LABEL[r.arm],
          r.medication ? MEDICATION_LABEL[r.medication] : '—',
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

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-start justify-between gap-3">
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
              onClick={toggleLock}
              title={locked ? 'Unlock to edit or delete readings' : 'Lock editing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border"
              style={{
                borderColor: locked ? 'rgba(var(--copper-bold-rgb),0.3)' : 'rgba(76,175,80,0.5)',
                color: locked ? 'var(--copper-tan)' : '#4caf50',
              }}
            >
              {locked ? <Lock size={14} /> : <Unlock size={14} />}
              {locked ? 'Locked' : 'Unlocked'}
            </button>
          )}
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
        </div>
      </div>

      {/* ── Add Reading form (top) ────────────────────────────────────────── */}
      {showForm ? (
        <div className="rounded-md p-4 mb-4 space-y-3" style={{ background: 'rgba(20,18,16,0.6)', border: '1px solid rgba(184,115,51,0.2)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: 'var(--copper-tan)' }}>Add a Reading</h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ color: 'rgba(var(--copper-tan-rgb),0.5)' }}>
              <X size={14} />
            </button>
          </div>

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

          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Medication (optional)</label>
              <select value={form.medication} onChange={e => setForm(f => ({ ...f, medication: e.target.value as Medication | '' }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                <option value="" style={{ color: '#000' }}>None</option>
                {Object.entries(MEDICATION_LABEL).map(([v, label]) => (
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
              Add Reading
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md text-sm font-semibold border" style={{ borderColor: 'rgba(var(--copper-bold-rgb),0.3)', color: 'var(--copper-tan)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold mb-4"
          style={{ background: 'var(--copper-bold)', color: 'var(--stone-0)' }}
        >
          <Plus size={14} /> Add Reading
        </button>
      )}

      {confirmMsg && (
        <div className="mb-3 text-xs rounded-md p-2" style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50' }}>
          {confirmMsg}
        </div>
      )}

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      {readings.length >= 2 && <BPChart readings={readings} />}

      {/* ── Readings table ───────────────────────────────────────────────── */}
      {readings.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>
          No readings logged yet. Click &quot;Add Reading&quot; above to start tracking.
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
                <th className="text-left px-3 py-2">Medication</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthGroups.map(month => {
                const monthCollapsed = collapsedMonths.has(month.key);
                const monthCount = month.weeks.reduce((n, w) => n + w.readings.length, 0);
                return (
                  <Fragment key={month.key}>
                    <tr style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.15)' }}>
                      <td colSpan={8} className="px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => toggleMonth(month.key)}
                          className="flex items-center gap-1.5 w-full text-left font-semibold text-sm"
                          style={{ color: 'var(--copper-tan)' }}
                        >
                          {monthCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {month.label}
                          <span className="text-xs font-normal" style={{ color: 'rgba(var(--copper-tan-rgb),0.5)' }}>
                            ({monthCount} reading{monthCount === 1 ? '' : 's'})
                          </span>
                        </button>
                      </td>
                    </tr>
                    {!monthCollapsed && month.weeks.map(week => {
                      const weekCollapsed = collapsedWeeks.has(week.key);
                      return (
                        <Fragment key={week.key}>
                          <tr style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.08)' }}>
                            <td colSpan={8} className="pl-8 pr-3 py-1">
                              <button
                                type="button"
                                onClick={() => toggleWeek(week.key)}
                                className="flex items-center gap-1.5 w-full text-left text-xs"
                                style={{ color: 'rgba(var(--copper-tan-rgb),0.75)' }}
                              >
                                {weekCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                {week.label}
                                <span style={{ color: 'rgba(var(--copper-tan-rgb),0.45)' }}>({week.readings.length})</span>
                              </button>
                            </td>
                          </tr>
                          {!weekCollapsed && week.readings.map(r => {
                            if (editingId === r.id) {
                              const liveSystolic = Number(form.systolic);
                              const liveDiastolic = Number(form.diastolic);
                              const cat = Number.isInteger(liveSystolic) && Number.isInteger(liveDiastolic)
                                ? getCategory(liveSystolic, liveDiastolic)
                                : getCategory(r.systolic, r.diastolic);
                              return (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.1)', background: 'rgba(184,115,51,0.08)' }}>
                                  <td className="px-3 py-2 pl-10">
                                    <input type="datetime-local" value={form.reading_at} onChange={e => setForm(f => ({ ...f, reading_at: e.target.value }))} className="w-full border px-1.5 py-1 text-xs rounded" style={inputStyle} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <input value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))} inputMode="numeric" className="w-10 border px-1 py-1 text-xs rounded" style={inputStyle} />
                                      <span>/</span>
                                      <input value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))} inputMode="numeric" className="w-10 border px-1 py-1 text-xs rounded" style={inputStyle} />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input value={form.heart_rate} onChange={e => setForm(f => ({ ...f, heart_rate: e.target.value }))} inputMode="numeric" placeholder="—" className="w-14 border px-1 py-1 text-xs rounded" style={inputStyle} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as Position }))} className="w-full border px-1 py-1 text-xs rounded" style={inputStyle}>
                                      {Object.entries(POSITION_LABEL).map(([v, label]) => (<option key={v} value={v} style={{ color: '#000' }}>{label}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={form.arm} onChange={e => setForm(f => ({ ...f, arm: e.target.value as Arm }))} className="w-full border px-1 py-1 text-xs rounded" style={inputStyle}>
                                      {Object.entries(ARM_LABEL).map(([v, label]) => (<option key={v} value={v} style={{ color: '#000' }}>{label}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <select value={form.medication} onChange={e => setForm(f => ({ ...f, medication: e.target.value as Medication | '' }))} className="w-full border px-1 py-1 text-xs rounded" style={inputStyle}>
                                      <option value="" style={{ color: '#000' }}>None</option>
                                      {Object.entries(MEDICATION_LABEL).map(([v, label]) => (<option key={v} value={v} style={{ color: '#000' }}>{label}</option>))}
                                    </select>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: `${cat.color}2e`, color: cat.color }}>
                                      {cat.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center justify-end gap-2">
                                      <button type="button" onClick={saveForm} title="Save"><Check size={15} style={{ color: '#4caf50' }} /></button>
                                      <button type="button" onClick={cancelEdit} title="Cancel"><X size={15} style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }} /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            const cat = getCategory(r.systolic, r.diastolic);
                            return (
                              <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.1)' }}>
                                <td className="px-3 py-2 pl-10 whitespace-nowrap">{formatDateTime(r.reading_at)}</td>
                                <td className="px-3 py-2 font-semibold">{r.systolic}/{r.diastolic}</td>
                                <td className="px-3 py-2">{r.heart_rate != null ? `${r.heart_rate} bpm` : '—'}</td>
                                <td className="px-3 py-2">{POSITION_LABEL[r.position]}</td>
                                <td className="px-3 py-2">{ARM_LABEL[r.arm]}</td>
                                <td className="px-3 py-2">{r.medication ? MEDICATION_LABEL[r.medication] : '—'}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ background: `${cat.color}2e`, color: cat.color }}>
                                    {cat.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {!locked && (
                                    <div className="flex items-center justify-end gap-2">
                                      <button type="button" onClick={() => startEdit(r)} title="Edit"><Pencil size={13} style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }} /></button>
                                      <button type="button" onClick={() => deleteReading(r)} title="Delete"><Trash2 size={13} style={{ color: '#c85050' }} /></button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
