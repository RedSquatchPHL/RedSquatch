'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Drumstick } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import {
  useEntries, useProfile, num, dayKey, fmtShort,
  inputStyle, panelStyle, primaryBtn, ghostBtn, axisStyle, gridStyle, tooltipBox,
  Field, ModuleHeader, Loading,
} from './shared';
import NutritionDayLog, { type HydrationRow, type ProteinRow } from './NutritionDayLog';

const TREND_DAYS = 14;
const CAL_COLOR = 'var(--rs-warn, var(--rs-accent))';

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

function Progress({ title, unit, color, icon: Icon, goal, total }: {
  title: string; unit: string; color: string; icon: typeof Droplets; goal: number | null; total: number;
}) {
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
    </div>
  );
}

export default function NutritionTracker({ reloadSignal }: { reloadSignal?: number }) {
  const hydration = useEntries<HydrationRow>('/hydration');
  const protein = useEntries<ProteinRow>('/protein');

  useEffect(() => {
    if (reloadSignal === undefined) return;
    hydration.reload();
    protein.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadSignal]);
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
    const cal = new Map<string, number>();
    for (const r of hydration.entries) oz.set(dayKey(r.logged_at), (oz.get(dayKey(r.logged_at)) ?? 0) + (num(r.ounces) ?? 0));
    for (const r of protein.entries) {
      g.set(dayKey(r.logged_at), (g.get(dayKey(r.logged_at)) ?? 0) + (num(r.grams) ?? 0));
      cal.set(dayKey(r.logged_at), (cal.get(dayKey(r.logged_at)) ?? 0) + (num(r.calories) ?? 0));
    }
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return days.map(d => ({ day: d, label: fmtShort(`${d}T12:00`), ounces: r1(oz.get(d) ?? 0), grams: r1(g.get(d) ?? 0), calories: r1(cal.get(d) ?? 0) }));
  }, [hydration.entries, protein.entries]);

  if (hydration.loading || protein.loading || !profile) return <Loading />;

  const isToday = day === dayKey(new Date());

  const dayOunces = hydration.entries.filter(r => dayKey(r.logged_at) === day).reduce((t, r) => t + (num(r.ounces) ?? 0), 0);
  const dayGrams = protein.entries.filter(r => dayKey(r.logged_at) === day).reduce((t, r) => t + (num(r.grams) ?? 0), 0);
  const dayMacros = protein.entries.filter(r => dayKey(r.logged_at) === day).reduce(
    (t, r) => ({ calories: t.calories + (num(r.calories) ?? 0), fat: t.fat + (num(r.fat_g) ?? 0), carbs: t.carbs + (num(r.carbs_g) ?? 0) }),
    { calories: 0, fat: 0, carbs: 0 },
  );

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

  const chart = (key: 'ounces' | 'grams' | 'calories', color: string, goal: number | null, unit: string) => (
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
      <ModuleHeader title="Day & Trends" blurb="Daily running totals against your goals. Log drinks and meals on the Log tab; edit or delete any entry in the day log below." error={hydration.error ?? protein.error ?? goalErr} />

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
        <Progress title="Hydration" unit="oz" color="var(--rs-info)" icon={Droplets} goal={profile.hydration_goal_oz} total={dayOunces} />
        <Progress title="Protein" unit="g" color="var(--rs-accent)" icon={Drumstick} goal={profile.protein_goal_g} total={dayGrams} />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md px-3 py-1.5 mb-5 text-xs" style={panelStyle}>
        <span style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>{labelDay(day)}</span>
        <span>Calories <strong style={{ color: CAL_COLOR }}>{Math.round(dayMacros.calories)}</strong></span>
        <span>Fat <strong>{Math.round(dayMacros.fat * 10) / 10} g</strong></span>
        <span>Carbs <strong>{Math.round(dayMacros.carbs * 10) / 10} g</strong></span>
      </div>

      <div className="mb-5">
        <NutritionDayLog key={day} day={day} hydration={hydration} protein={protein} />
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
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>Calories · last {TREND_DAYS} days</div>
          {chart('calories', CAL_COLOR, null, 'cal')}
        </div>
      </div>
    </div>
  );
}
