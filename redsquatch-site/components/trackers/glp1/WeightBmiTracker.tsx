'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { bmi, bmiCategory, movingAverage, weightSlopePerDay } from '@/lib/glp1';
import {
  useEntries, useProfile, num, toLocalInput, fmtDateTime, fmtShort,
  inputStyle, panelStyle, primaryBtn, ghostBtn, axisStyle, gridStyle, tooltipBox,
  Field, Stat, ModuleHeader, Loading,
} from './shared';

interface WeightRow { id: number; measured_at: string; weight_lb: string | number; notes: string | null }

const emptyForm = () => ({ weight_lb: '', measured_at: toLocalInput(new Date()), notes: '' });

export default function WeightBmiTracker() {
  const { entries, loading, error, add, update, remove } = useEntries<WeightRow>('/weight');
  const { profile, save: saveProfile } = useProfile();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ height_in: string; target_weight_lb: string } | null>(null);

  // Oldest-first for charting and trend math.
  const points = useMemo(
    () => [...entries]
      .map(e => ({ id: e.id, t: new Date(e.measured_at).getTime(), lb: num(e.weight_lb) ?? 0 }))
      .sort((a, b) => a.t - b.t),
    [entries]
  );

  const chartData = useMemo(() => {
    const ma = movingAverage(points, 7);
    return points.map((p, i) => ({
      label: fmtShort(p.t),
      fullLabel: fmtDateTime(new Date(p.t).toISOString()),
      weight: p.lb,
      average: Math.round(ma[i] * 10) / 10,
    }));
  }, [points]);

  if (loading || !profile) return <Loading />;

  const current = points.length ? points[points.length - 1].lb : null;
  const start = points.length ? points[0].lb : null;
  const currentBmi = current !== null && profile.height_in ? bmi(current, profile.height_in) : null;
  const cat = currentBmi !== null ? bmiCategory(currentBmi) : null;
  const slope = weightSlopePerDay(points, 30);
  const toTarget = current !== null && profile.target_weight_lb ? current - profile.target_weight_lb : null;

  // Only project a date when the trend is actually heading toward the target.
  let goalDate: string | null = null;
  if (toTarget !== null && slope !== null && toTarget > 0 && slope < 0) {
    const days = toTarget / -slope;
    if (days < 3650) goalDate = new Date(Date.now() + days * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function startEdit(r: WeightRow) {
    setEditingId(r.id);
    setForm({ weight_lb: String(num(r.weight_lb) ?? ''), measured_at: toLocalInput(r.measured_at), notes: r.notes ?? '' });
    setShowForm(true);
    setFormError(null);
  }

  async function submit() {
    const w = Number(form.weight_lb);
    if (!form.weight_lb.trim() || !Number.isFinite(w)) { setFormError('Enter a weight in pounds.'); return; }
    const body = { weight_lb: w, measured_at: new Date(form.measured_at).toISOString(), notes: form.notes.trim() || null };
    try {
      if (editingId !== null) await update(editingId, body); else await add(body);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save.');
    }
  }

  async function submitProfile() {
    if (!profileDraft) return;
    const h = profileDraft.height_in.trim() ? Number(profileDraft.height_in) : null;
    const t = profileDraft.target_weight_lb.trim() ? Number(profileDraft.target_weight_lb) : null;
    try {
      await saveProfile({ ...profile!, height_in: h, target_weight_lb: t });
      setProfileDraft(null);
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save profile.');
    }
  }

  const sign = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;

  return (
    <div style={{ color: 'var(--copper-tan)' }}>
      <ModuleHeader title="Weight & BMI" blurb="Weigh-ins in pounds, with BMI from your height and a trend toward your target." error={error ?? formError} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Current" value={current !== null ? `${current.toFixed(1)} lb` : '—'} sub={points.length ? `${points.length} weigh-ins` : 'No entries yet'} />
        <Stat
          label="BMI"
          value={currentBmi !== null ? currentBmi.toFixed(1) : '—'}
          sub={cat ? cat.label : 'Set height below'}
          color={cat?.color}
        />
        <Stat
          label="Since start"
          value={current !== null && start !== null ? `${sign(current - start)} lb` : '—'}
          sub={slope !== null ? `${sign(slope * 7)} lb/wk (30 d trend)` : undefined}
        />
        <Stat
          label="To target"
          value={toTarget !== null ? (toTarget > 0 ? `${toTarget.toFixed(1)} lb` : 'Reached') : '—'}
          sub={goalDate ? `≈ ${goalDate}` : profile.target_weight_lb ? `Target ${profile.target_weight_lb} lb` : 'Set a target below'}
        />
      </div>

      {chartData.length > 1 && (
        <div className="rounded-lg mb-4" style={{ padding: '12px 4px 4px', background: 'rgba(20,18,16,0.6)' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
              <Tooltip
                cursor={{ stroke: 'rgba(184,115,51,0.25)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div style={tooltipBox}>
                      <div style={{ color: 'rgba(212,163,115,0.7)', marginBottom: 6, fontSize: 11 }}>{p.fullLabel}</div>
                      <div style={{ color: '#d4a373' }}>Weight: <strong>{p.weight} lb</strong></div>
                      <div style={{ color: '#7fb3d5' }}>7-entry avg: <strong>{p.average} lb</strong></div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(212,163,115,0.7)' }} />
              {profile.target_weight_lb && (
                <ReferenceLine y={profile.target_weight_lb} stroke="#4caf50" strokeDasharray="4 4" label={{ value: 'Target', fill: '#4caf50', fontSize: 11, position: 'insideBottomRight' }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#d4a373" strokeWidth={2} dot={{ r: 3, fill: '#d4a373' }} activeDot={{ r: 6 }} name="Weight" />
              <Line type="monotone" dataKey="average" stroke="#7fb3d5" strokeWidth={2} strokeDasharray="5 3" dot={false} name="7-entry avg" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Profile */}
      <div className="rounded-md p-3 mb-4 flex flex-wrap items-end gap-3" style={panelStyle}>
        {profileDraft ? (
          <>
            <Field label="Height (in)">
              <input value={profileDraft.height_in} onChange={e => setProfileDraft(d => d && ({ ...d, height_in: e.target.value }))} inputMode="decimal" placeholder="e.g. 70" className="w-24 border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </Field>
            <Field label="Target weight (lb)">
              <input value={profileDraft.target_weight_lb} onChange={e => setProfileDraft(d => d && ({ ...d, target_weight_lb: e.target.value }))} inputMode="decimal" placeholder="e.g. 165" className="w-28 border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </Field>
            <button type="button" onClick={submitProfile} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold" style={primaryBtn}><Check size={13} /> Save</button>
            <button type="button" onClick={() => setProfileDraft(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}>Cancel</button>
          </>
        ) : (
          <>
            <div className="text-xs" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>
              Height: <strong style={{ color: 'var(--copper-tan)' }}>{profile.height_in ? `${profile.height_in} in` : 'not set'}</strong>
              <span className="mx-2">·</span>
              Target: <strong style={{ color: 'var(--copper-tan)' }}>{profile.target_weight_lb ? `${profile.target_weight_lb} lb` : 'not set'}</strong>
            </div>
            <button
              type="button"
              onClick={() => setProfileDraft({ height_in: profile.height_in?.toString() ?? '', target_weight_lb: profile.target_weight_lb?.toString() ?? '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}
            ><Pencil size={12} /> Edit</button>
          </>
        )}
      </div>

      {showForm ? (
        <div className="rounded-md p-4 mb-4 space-y-3" style={panelStyle}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">{editingId !== null ? 'Edit weigh-in' : 'Log a weigh-in'}</h3>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }} style={{ color: 'rgba(var(--copper-tan-rgb),0.5)' }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Weight (lb)">
              <input value={form.weight_lb} onChange={e => setForm(f => ({ ...f, weight_lb: e.target.value }))} inputMode="decimal" placeholder="e.g. 214.6" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </Field>
            <Field label="Date/Time">
              <input type="datetime-local" value={form.measured_at} onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </Field>
            <Field label="Notes (optional)">
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </Field>
          </div>
          <button type="button" onClick={submit} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold" style={primaryBtn}><Check size={14} /> {editingId !== null ? 'Save changes' : 'Add'}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold mb-4" style={primaryBtn}>
          <Plus size={14} /> Log weigh-in
        </button>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>No weigh-ins yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-md" style={{ background: 'rgba(20,18,16,0.6)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(var(--copper-bold-rgb),0.2)' }}>
                <th className="text-left px-3 py-2">Date/Time</th>
                <th className="text-left px-3 py-2">Weight</th>
                <th className="text-left px-3 py-2">BMI</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(r => {
                const lb = num(r.weight_lb);
                const b = lb !== null && profile.height_in ? bmi(lb, profile.height_in) : null;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.1)' }}>
                    <td className="px-3 py-2">{fmtDateTime(r.measured_at)}</td>
                    <td className="px-3 py-2 font-semibold">{lb?.toFixed(1)} lb</td>
                    <td className="px-3 py-2">{b !== null ? b.toFixed(1) : '—'}</td>
                    <td className="px-3 py-2" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>{r.notes ?? ''}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button type="button" onClick={() => startEdit(r)} className="p-1" aria-label="Edit"><Pencil size={13} /></button>
                      <button
                        type="button"
                        onClick={() => { if (confirm('Delete this weigh-in?')) remove(r.id).catch(() => setFormError('Failed to delete.')); }}
                        className="p-1 ml-1" aria-label="Delete"
                      ><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
