'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Drumstick, Trash2, Pencil, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import {
  useEntries, useProfile, num, dayKey, toLocalInput, fmtShort,
  inputStyle, panelStyle, primaryBtn, ghostBtn, axisStyle, gridStyle, tooltipBox,
  Field, ModuleHeader, Loading,
} from './shared';

interface HydrationRow { id: number; logged_at: string; ounces: string | number; notes: string | null }
interface ProteinRow { id: number; logged_at: string; grams: string | number; notes: string | null }

const HYDRATION_QUICK = [8, 12, 16, 24];
const PROTEIN_QUICK = [10, 20, 30, 40];
const TREND_DAYS = 14;

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

function labelDay(key: string): string {
  const today = dayKey(new Date());
  if (key === today) return 'Today';
  if (key === shiftDay(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function ProgressBar({ value, goal, color }: { value: number; goal: number | null; color: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(var(--rs-edge-rgb),0.15)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// One logger (hydration or protein) — same shape, different unit and quick amounts.
function Logger<T extends { id: number; logged_at: string; notes: string | null }>({
  title, unit, color, icon: Icon, quick, goal, rows, day, amountOf, onAdd, onUpdate, onRemove,
}: {
  title: string; unit: string; color: string; icon: typeof Droplets; quick: number[]; goal: number | null;
  rows: T[]; day: string; amountOf: (r: T) => number;
  onAdd: (amount: number, at: Date) => Promise<void>;
  onUpdate: (id: number, amount: number, at: Date) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [custom, setCustom] = useState('');
  // HH:MM for the entry's time of day; empty means "auto" (see stampFor).
  const [time, setTime] = useState('');
  const [editing, setEditing] = useState<{ id: number; amount: string; at: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dayRows = rows.filter(r => dayKey(r.logged_at) === day);
  const total = dayRows.reduce((s, r) => s + amountOf(r), 0);

  // An explicit time wins. Otherwise a past day is stamped at noon and today at "now".
  const stampFor = () => {
    const [y, m, d] = day.split('-').map(Number);
    if (time) {
      const [hh, mm] = time.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm);
    }
    if (day === dayKey(new Date())) return new Date();
    return new Date(y, m - 1, d, 12, 0);
  };

  async function run(fn: () => Promise<void>) {
    try { await fn(); setErr(null); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); }
  }

  return (
    <div className="rounded-md p-4" style={panelStyle}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color }} />
        <h3 className="text-sm font-bold">{title}</h3>
        <span className="ml-auto text-sm">
          <strong style={{ color }}>{Math.round(total * 10) / 10}</strong>
          <span style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}> / {goal ?? '—'} {unit}</span>
        </span>
      </div>
      <ProgressBar value={total} goal={goal} color={color} />

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <label className="flex items-center gap-1 text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>
          Time
          <input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label={`${title} entry time`}
            className="border px-1.5 py-1 text-xs rounded" style={inputStyle} />
          {time && <button type="button" onClick={() => setTime('')} className="underline" style={{ color: 'var(--rs-accent)' }}>{day === dayKey(new Date()) ? 'now' : 'noon'}</button>}
        </label>
        {quick.map(q => (
          <button key={q} type="button" onClick={() => run(() => onAdd(q, stampFor()))}
            className="px-2.5 py-1 rounded-md text-xs font-semibold border" style={ghostBtn}>+{q} {unit}</button>
        ))}
        <input value={custom} onChange={e => setCustom(e.target.value)} inputMode="decimal" placeholder={`Custom ${unit}`}
          className="w-24 border px-2 py-1 text-xs rounded" style={inputStyle}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
        <button type="button" disabled={!custom.trim()}
          onClick={() => {
            const n = Number(custom);
            if (!Number.isFinite(n) || n <= 0) { setErr(`Enter a positive number of ${unit}.`); return; }
            run(async () => { await onAdd(n, stampFor()); setCustom(''); });
          }}
          className="px-2.5 py-1 rounded-md text-xs font-semibold disabled:opacity-40" style={primaryBtn}>Add</button>
      </div>
      {err && <p className="text-xs mt-2 text-[color:var(--rs-bad)]">{err}</p>}

      <ul className="mt-3 space-y-1">
        {dayRows.length === 0 && <li className="text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}>Nothing logged.</li>}
        {dayRows.map(r => (
          <li key={r.id} className="flex items-center gap-2 text-xs py-1" style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
            {editing?.id === r.id ? (
              <>
                <input type="datetime-local" value={editing.at} onChange={e => setEditing(x => x && ({ ...x, at: e.target.value }))} className="border px-1 py-0.5 rounded" style={inputStyle} />
                <input value={editing.amount} onChange={e => setEditing(x => x && ({ ...x, amount: e.target.value }))} inputMode="decimal" className="w-16 border px-1 py-0.5 rounded" style={inputStyle} />
                <button type="button" aria-label="Save" onClick={() => {
                  const n = Number(editing.amount);
                  if (!Number.isFinite(n) || n <= 0) { setErr(`Enter a positive number of ${unit}.`); return; }
                  run(async () => { await onUpdate(r.id, n, new Date(editing.at)); setEditing(null); });
                }}><Check size={14} /></button>
                <button type="button" aria-label="Cancel" onClick={() => setEditing(null)}><X size={14} /></button>
              </>
            ) : (
              <>
                <span style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>{new Date(r.logged_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="font-semibold">{amountOf(r)} {unit}</span>
                <span className="ml-auto flex gap-1">
                  <button type="button" aria-label="Edit" onClick={() => setEditing({ id: r.id, amount: String(amountOf(r)), at: toLocalInput(r.logged_at) })}><Pencil size={12} /></button>
                  <button type="button" aria-label="Delete" onClick={() => run(() => onRemove(r.id))}><Trash2 size={12} /></button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NutritionTracker() {
  const hydration = useEntries<HydrationRow>('/hydration');
  const protein = useEntries<ProteinRow>('/protein');
  const { profile, save: saveProfile } = useProfile();

  const [day, setDay] = useState(dayKey(new Date()));
  const [goalDraft, setGoalDraft] = useState<{ oz: string; g: string } | null>(null);
  const [goalErr, setGoalErr] = useState<string | null>(null);

  const trend = useMemo(() => {
    const days: string[] = [];
    const today = dayKey(new Date());
    for (let i = TREND_DAYS - 1; i >= 0; i--) days.push(shiftDay(today, -i));
    const oz = new Map<string, number>();
    const g = new Map<string, number>();
    for (const r of hydration.entries) oz.set(dayKey(r.logged_at), (oz.get(dayKey(r.logged_at)) ?? 0) + (num(r.ounces) ?? 0));
    for (const r of protein.entries) g.set(dayKey(r.logged_at), (g.get(dayKey(r.logged_at)) ?? 0) + (num(r.grams) ?? 0));
    return days.map(d => ({ day: d, label: fmtShort(`${d}T12:00`), ounces: Math.round((oz.get(d) ?? 0) * 10) / 10, grams: Math.round((g.get(d) ?? 0) * 10) / 10 }));
  }, [hydration.entries, protein.entries]);

  if (hydration.loading || protein.loading || !profile) return <Loading />;

  const isToday = day === dayKey(new Date());

  async function submitGoals() {
    if (!goalDraft) return;
    const oz = Number(goalDraft.oz);
    const g = goalDraft.g.trim() ? Number(goalDraft.g) : null;
    if (!Number.isFinite(oz) || oz <= 0) { setGoalErr('Hydration goal must be a positive number.'); return; }
    try {
      await saveProfile({ ...profile!, hydration_goal_oz: oz, protein_goal_g: g });
      setGoalDraft(null);
      setGoalErr(null);
    } catch (e) {
      setGoalErr(e instanceof Error ? e.message : 'Failed to save goals.');
    }
  }

  const chart = (key: 'ounces' | 'grams', color: string, goal: number | null, unit: string) => (
    <div className="rounded-lg" style={{ padding: '12px 4px 4px', background: 'var(--rs-well)' }}>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval={1} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={32} />
          <Tooltip cursor={{ fill: 'rgba(var(--rs-edge-rgb),0.08)' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof trend)[number];
            return <div style={tooltipBox}>{p.label}: <strong style={{ color }}>{p[key]} {unit}</strong></div>;
          }} />
          {goal && <ReferenceLine y={goal} stroke="var(--rs-ok)" strokeDasharray="4 4" />}
          <Bar dataKey={key} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{ color: 'var(--rs-accent)' }}>
      <ModuleHeader title="Hydration & Protein" blurb="Daily running totals against your goals. Tap a quick amount or enter your own." error={hydration.error ?? protein.error ?? goalErr} />

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous day" onClick={() => setDay(d => shiftDay(d, -1))} className="p-1.5 rounded-md border" style={ghostBtn}><ChevronLeft size={14} /></button>
          <div className="px-3 text-sm font-semibold min-w-[110px] text-center">{labelDay(day)}</div>
          <button type="button" aria-label="Next day" disabled={isToday} onClick={() => setDay(d => shiftDay(d, 1))} className="p-1.5 rounded-md border disabled:opacity-30" style={ghostBtn}><ChevronRight size={14} /></button>
          {!isToday && <button type="button" onClick={() => setDay(dayKey(new Date()))} className="ml-2 px-2 py-1 rounded-md text-xs border" style={ghostBtn}>Today</button>}
        </div>

        {goalDraft ? (
          <div className="flex items-end gap-2">
            <Field label="Water goal (oz)"><input value={goalDraft.oz} onChange={e => setGoalDraft(d => d && ({ ...d, oz: e.target.value }))} inputMode="decimal" className="w-20 border px-2 py-1 text-sm rounded" style={inputStyle} /></Field>
            <Field label="Protein goal (g)"><input value={goalDraft.g} onChange={e => setGoalDraft(d => d && ({ ...d, g: e.target.value }))} inputMode="decimal" placeholder="—" className="w-20 border px-2 py-1 text-sm rounded" style={inputStyle} /></Field>
            <button type="button" onClick={submitGoals} className="px-3 py-1.5 rounded-md text-xs font-semibold" style={primaryBtn}>Save</button>
            <button type="button" onClick={() => setGoalDraft(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}>Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setGoalDraft({ oz: String(profile.hydration_goal_oz), g: profile.protein_goal_g?.toString() ?? '' })} className="px-3 py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}>Edit goals</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Logger
          key={`h-${day}`}
          title="Hydration" unit="oz" color="var(--rs-info)" icon={Droplets} quick={HYDRATION_QUICK} goal={profile.hydration_goal_oz}
          rows={hydration.entries} day={day} amountOf={r => num(r.ounces) ?? 0}
          onAdd={(ounces, at) => hydration.add({ ounces, logged_at: at.toISOString(), notes: null })}
          onUpdate={(id, ounces, at) => hydration.update(id, { ounces, logged_at: at.toISOString(), notes: null })}
          onRemove={hydration.remove}
        />
        <Logger
          key={`p-${day}`}
          title="Protein" unit="g" color="var(--rs-accent)" icon={Drumstick} quick={PROTEIN_QUICK} goal={profile.protein_goal_g}
          rows={protein.entries} day={day} amountOf={r => num(r.grams) ?? 0}
          onAdd={(grams, at) => protein.add({ grams, logged_at: at.toISOString(), notes: null })}
          onUpdate={(id, grams, at) => protein.update(id, { grams, logged_at: at.toISOString(), notes: null })}
          onRemove={protein.remove}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>Water · last {TREND_DAYS} days</div>
          {chart('ounces', 'var(--rs-info)', profile.hydration_goal_oz, 'oz')}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>Protein · last {TREND_DAYS} days</div>
          {chart('grams', 'var(--rs-accent)', profile.protein_goal_g, 'g')}
        </div>
      </div>
    </div>
  );
}
