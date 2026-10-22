'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { DRUGS, BMI_BANDS, weightAtBmi, bmi, bmiCategory, levelAt, movingAverage, weightSlopePerDay, type DoseEvent } from '@/lib/glp1';
import {
  useEntries, useProfile, num, toLocalInput, fmtDateTime, fmtShort,
  inputStyle, panelStyle, primaryBtn, ghostBtn, axisStyle, gridStyle, tooltipBox,
  Field, Stat, ModuleHeader, Loading, GroupedRows, LockToggle,
} from './shared';
import type { InjectionRow } from './InjectionTracker';

const DAY = 86400000;

interface WeightRow { id: number; measured_at: string; weight_lb: string | number; notes: string | null }

const emptyForm = () => ({ weight_lb: '', measured_at: toLocalInput(new Date()), notes: '' });

export default function WeightBmiTracker() {
  const { entries, loading, error, add, update, remove } = useEntries<WeightRow>('/weight');
  const injections = useEntries<InjectionRow>('/injections');
  const { profile, save: saveProfile } = useProfile();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [reveal, setReveal] = useState<{ t: number; nonce: number } | null>(null);
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

  const doses: DoseEvent[] = useMemo(
    () => injections.entries
      .map(e => ({ t: new Date(e.injected_at).getTime(), mg: num(e.dose_mg) ?? 0, medication: e.medication }))
      .filter(d => d.mg > 0)
      .sort((a, b) => a.t - b.t),
    [injections.entries]
  );

  // For each weigh-in: the most recent injection before it, and the estimated
  // drug level at that moment (all earlier doses summed, same model as Drug Levels).
  const linkById = useMemo(() => {
    const map = new Map<number, { last: DoseEvent | null; level: number | null }>();
    for (const e of entries) {
      const t = new Date(e.measured_at).getTime();
      let last: DoseEvent | null = null;
      for (const d of doses) { if (d.t <= t) last = d; else break; }
      map.set(e.id, { last, level: last ? levelAt(doses, t) : null });
    }
    return map;
  }, [entries, doses]);

  if (loading || injections.loading || !profile) return <Loading />;

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

  // BMI swimlanes: pad the y-range around the data, then stretch it to take in the nearest
  // category limit on each side (capped) so the boundary you're heading toward is always visible.
  const lanes = (() => {
    const h = profile.height_in;
    if (!h || chartData.length < 2) return null;
    const vals = chartData.flatMap(d => [d.weight, d.average]);
    if (profile.target_weight_lb) vals.push(profile.target_weight_lb);
    const dMin = Math.min(...vals), dMax = Math.max(...vals);
    const pad = Math.max(3, (dMax - dMin) * 0.08);
    const cuts = BMI_BANDS.slice(1).map(b => weightAtBmi(b.bmiLo, h));
    const below = cuts.filter(c => c < dMin).pop();
    const above = cuts.find(c => c > dMax);
    const lo = Math.floor(Math.min(dMin - pad, below !== undefined && dMin - below <= 30 ? below - 2 : Infinity));
    const hi = Math.ceil(Math.max(dMax + pad, above !== undefined && above - dMax <= 30 ? above + 2 : -Infinity));
    const bands = BMI_BANDS.map(b => ({
      ...b,
      y1: Math.max(lo, b.bmiLo === 0 ? lo : weightAtBmi(b.bmiLo, h)),
      y2: Math.min(hi, Number.isFinite(b.bmiHi) ? weightAtBmi(b.bmiHi, h) : hi),
      lbLo: b.bmiLo === 0 ? null : Math.round(weightAtBmi(b.bmiLo, h)),
      lbHi: Number.isFinite(b.bmiHi) ? Math.round(weightAtBmi(b.bmiHi, h)) : null,
    })).filter(b => b.y2 > b.y1);
    return { lo, hi, bands };
  })();

  function startEdit(r: WeightRow) {
    setEditingId(r.id);
    setForm({ weight_lb: String(num(r.weight_lb) ?? ''), measured_at: toLocalInput(r.measured_at), notes: r.notes ?? '' });
    setShowForm(true);
    setFormError(null);
  }

  function toggleLock() {
    if (!locked) { setShowForm(false); setEditingId(null); setForm(emptyForm()); }
    setLocked(l => !l);
  }

  async function submit() {
    const w = Number(form.weight_lb);
    if (!form.weight_lb.trim() || !Number.isFinite(w)) { setFormError('Enter a weight in pounds.'); return; }
    const body = { weight_lb: w, measured_at: new Date(form.measured_at).toISOString(), notes: form.notes.trim() || null };
    try {
      if (editingId !== null) await update(editingId, body); else await add(body);
      setReveal({ t: new Date(form.measured_at).getTime(), nonce: Date.now() });
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
    <div style={{ color: 'var(--rs-accent)' }}>
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
        <div className="rounded-lg mb-4" style={{ padding: '12px 4px 4px', background: 'var(--rs-well)' }}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
              <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} domain={lanes ? [lanes.lo, lanes.hi] : ['auto', 'auto']} allowDataOverflow={!!lanes} />
              <Tooltip
                cursor={{ stroke: 'rgba(var(--rs-edge-rgb),0.25)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div style={tooltipBox}>
                      <div style={{ color: 'rgba(var(--rs-accent-rgb),0.7)', marginBottom: 6, fontSize: 11 }}>{p.fullLabel}</div>
                      <div style={{ color: 'var(--rs-accent)' }}>Weight: <strong>{p.weight} lb</strong></div>
                      <div style={{ color: 'var(--rs-info)' }}>7-entry avg: <strong>{p.average} lb</strong></div>
                    </div>
                  );
                }}
              />
              {lanes?.bands.map(b => (
                <ReferenceArea
                  key={b.label}
                  y1={b.y1}
                  y2={b.y2}
                  ifOverflow="hidden"
                  fill={`color-mix(in srgb, ${b.color} ${b.alpha}%, transparent)`}
                  stroke="none"
                  label={{ value: b.short, position: 'insideTopLeft', fill: 'var(--rs-ink-faint)', fontSize: 10 }}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(var(--rs-accent-rgb),0.7)' }} />
              {profile.target_weight_lb && (
                <ReferenceLine y={profile.target_weight_lb} stroke="var(--rs-ok)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--rs-ok)', fontSize: 11, position: 'insideBottomRight' }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="var(--rs-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--rs-accent)' }} activeDot={{ r: 6 }} name="Weight" />
              <Line type="monotone" dataKey="average" stroke="var(--rs-info)" strokeWidth={2} strokeDasharray="5 3" dot={false} name="7-entry avg" />
            </LineChart>
          </ResponsiveContainer>
          {lanes ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] px-2 pb-2 pt-1" style={{ color: 'var(--rs-ink-faint)' }}>
              {lanes.bands.map(b => (
                <span key={b.label}>
                  <i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: `color-mix(in srgb, ${b.color} ${Math.min(100, b.alpha * 3)}%, transparent)` }} />
                  {b.short}{' '}
                  {b.lbLo === null ? `< ${b.lbHi} lb` : b.lbHi === null ? `${b.lbLo}+ lb` : `${b.lbLo}–${b.lbHi} lb`}
                </span>
              ))}
            </div>
          ) : (
            !profile.height_in && <p className="text-[10px] text-center px-2 pb-2" style={{ color: 'var(--rs-ink-faint)' }}>Set your height below to see BMI swimlanes.</p>
          )}
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
            <div className="text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>
              Height: <strong style={{ color: 'var(--rs-accent)' }}>{profile.height_in ? `${profile.height_in} in` : 'not set'}</strong>
              <span className="mx-2">·</span>
              Target: <strong style={{ color: 'var(--rs-accent)' }}>{profile.target_weight_lb ? `${profile.target_weight_lb} lb` : 'not set'}</strong>
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
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm()); }} style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}><X size={16} /></button>
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
        <div className="flex items-center gap-2 mb-4">
          <button type="button" onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold" style={primaryBtn}>
            <Plus size={14} /> Log weigh-in
          </button>
          {entries.length > 0 && <LockToggle locked={locked} onToggle={toggleLock} noun="weigh-ins" />}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--rs-accent-rgb),0.55)' }}>No weigh-ins yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-md" style={{ background: 'var(--rs-well)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(var(--rs-edge-rgb),0.2)' }}>
                <th className="text-left px-3 py-2">Date/Time</th>
                <th className="text-left px-3 py-2">Weight</th>
                <th className="text-left px-3 py-2">BMI</th>
                <th className="text-left px-3 py-2">Last injection</th>
                <th className="text-left px-3 py-2">Est. GLP-1 level</th>
                <th className="text-left px-3 py-2">Notes</th>
                {!locked && <th className="text-right px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              <GroupedRows
                rows={entries}
                getTime={r => new Date(r.measured_at).getTime()}
                colSpan={locked ? 6 : 7}
                noun="weigh-in"
                reveal={reveal}
                renderRow={r => {
                  const lb = num(r.weight_lb);
                  const b = lb !== null && profile.height_in ? bmi(lb, profile.height_in) : null;
                  const link = linkById.get(r.id);
                  const days = link?.last ? Math.floor((new Date(r.measured_at).getTime() - link.last.t) / DAY) : null;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
                      <td className="px-3 py-2 pl-10">{fmtDateTime(r.measured_at)}</td>
                      <td className="px-3 py-2 font-semibold">{lb?.toFixed(1)} lb</td>
                      <td className="px-3 py-2">{b !== null ? b.toFixed(1) : '—'}</td>
                      <td className="px-3 py-2">
                        {link?.last ? (
                          <>
                            {fmtShort(link.last.t)} · {link.last.mg} mg {DRUGS[link.last.medication].label}
                            <span style={{ color: 'rgba(var(--rs-accent-rgb),0.55)' }}> ({days === 0 ? 'same day' : `${days}d before`})</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">{link?.level != null ? `${link.level.toFixed(2)} mg` : '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>{r.notes ?? ''}</td>
                      {!locked && (
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button type="button" onClick={() => startEdit(r)} className="p-1" aria-label="Edit"><Pencil size={13} /></button>
                          <button
                            type="button"
                            onClick={() => { if (confirm('Delete this weigh-in?')) remove(r.id).catch(() => setFormError('Failed to delete.')); }}
                            className="p-1 ml-1" aria-label="Delete"
                          ><Trash2 size={13} /></button>
                        </td>
                      )}
                    </tr>
                  );
                }}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
