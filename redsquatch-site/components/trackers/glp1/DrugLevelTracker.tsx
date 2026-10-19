'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer } from 'recharts';
import {
  DRUGS, levelAt, levelSeries, steadyStateAverage, typicalIntervalDays, type DoseEvent,
} from '@/lib/glp1';
import {
  useEntries, num, fmtShort,
  panelStyle, ghostBtn, primaryBtn, axisStyle, gridStyle, tooltipBox, Stat, ModuleHeader, Loading,
} from './shared';
import type { InjectionRow } from './InjectionTracker';

const DAY = 86400000;
const WINDOWS = [{ label: '4 wk', days: 28 }, { label: '8 wk', days: 56 }, { label: '6 mo', days: 182 }] as const;
const FORECAST_DAYS = 14;

export default function DrugLevelTracker() {
  const { entries, loading, error } = useEntries<InjectionRow>('/injections');
  const [windowDays, setWindowDays] = useState<number>(56);

  const doses: DoseEvent[] = useMemo(
    () => entries
      .map(e => ({ t: new Date(e.injected_at).getTime(), mg: num(e.dose_mg) ?? 0, medication: e.medication }))
      .filter(d => d.mg > 0)
      .sort((a, b) => a.t - b.t),
    [entries]
  );

  const now = Date.now();

  const series = useMemo(() => {
    if (!doses.length) return [];
    const from = Math.max(doses[0].t - DAY, now - windowDays * DAY);
    return levelSeries(doses, from, now + FORECAST_DAYS * DAY).map(p => ({
      t: p.t,
      mg: Math.round(p.mg * 100) / 100,
      past: p.t <= now ? Math.round(p.mg * 100) / 100 : null,
      future: p.t >= now - 6 * 3600000 ? Math.round(p.mg * 100) / 100 : null,
    }));
  }, [doses, windowDays, now]);

  if (loading) return <Loading />;

  if (!doses.length) {
    return (
      <div style={{ color: 'var(--copper-tan)' }}>
        <ModuleHeader title="Drug Levels" blurb="Estimated active medication in your body, from your logged injections." error={error} />
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>
          Log an injection in the Injections module and the estimate appears here.
        </div>
      </div>
    );
  }

  const last = doses[doses.length - 1];
  const drug = DRUGS[last.medication];
  const interval = typicalIntervalDays(doses.map(d => d.t));
  const current = levelAt(doses, now);
  const weekAgo = levelAt(doses, now - 7 * DAY);
  const nextDue = last.t + interval * DAY;
  const atNextDue = levelAt(doses, nextDue);
  const steady = steadyStateAverage(last.mg, last.medication, interval);
  const peakInView = Math.max(...series.map(p => p.mg));
  const delta = current - weekAgo;

  return (
    <div style={{ color: 'var(--copper-tan)' }}>
      <ModuleHeader title="Drug Levels" blurb={`Estimated ${drug.label} in your body from logged doses — a model, not a blood test.`} error={error} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Est. now" value={`${current.toFixed(2)} mg`} sub={`${delta >= 0 ? '+' : ''}${delta.toFixed(2)} vs 7 days ago`} />
        <Stat label="At next dose" value={`${atNextDue.toFixed(2)} mg`} sub={`due ${new Date(nextDue).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} />
        <Stat label="Steady-state avg" value={`${steady.toFixed(2)} mg`} sub={`${last.mg} mg every ${interval.toFixed(1)} d`} />
        <Stat label="% of steady state" value={`${Math.round((current / steady) * 100)}%`} sub={`t½ ${drug.halfLifeDays} d · peak ≈ ${drug.tmaxDays} d`} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Level over time (+{FORECAST_DAYS} d forecast)</span>
        <div className="flex gap-1">
          {WINDOWS.map(w => (
            <button key={w.days} type="button" onClick={() => setWindowDays(w.days)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold border" style={windowDays === w.days ? { ...primaryBtn, borderColor: 'var(--copper-bold)' } : ghostBtn}>{w.label}</button>
          ))}
        </div>
      </div>

      <div className="rounded-lg mb-3" style={{ padding: '12px 4px 4px', background: 'rgba(20,18,16,0.6)' }}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="levelFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4a373" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#d4a373" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
            <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} domain={[0, Math.ceil(peakInView * 1.15 * 10) / 10]} />
            <Tooltip
              cursor={{ stroke: 'rgba(184,115,51,0.25)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof series)[number];
                return (
                  <div style={tooltipBox}>
                    <div style={{ color: 'rgba(212,163,115,0.7)', fontSize: 11, marginBottom: 4 }}>
                      {new Date(p.t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}{p.t > now ? ' (forecast)' : ''}
                    </div>
                    <strong style={{ color: '#d4a373' }}>{p.mg} mg</strong>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="future" stroke="#d4a373" strokeDasharray="5 4" strokeWidth={2} fill="none" dot={false} isAnimationActive={false} connectNulls />
            <Area type="monotone" dataKey="past" stroke="#d4a373" strokeWidth={2} fill="url(#levelFill)" dot={false} isAnimationActive={false} />
            <ReferenceLine x={now} stroke="#7fb3d5" strokeDasharray="3 3" label={{ value: 'Now', fill: '#7fb3d5', fontSize: 11, position: 'insideTopRight' }} />
            <ReferenceLine y={steady} stroke="#4caf50" strokeDasharray="4 4" label={{ value: 'steady avg', fill: '#4caf50', fontSize: 10, position: 'insideBottomRight' }} />
            {doses.filter(d => d.t >= series[0].t).map(d => (
              <ReferenceDot key={d.t} x={d.t} y={Math.round(levelAt(doses, d.t) * 100) / 100} r={4} fill="#c85050" stroke="none" />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-md p-3 text-xs space-y-1" style={panelStyle}>
        <p><strong>How this is estimated.</strong> Each dose is absorbed gradually (peaking about {drug.tmaxDays} days after injecting) and then cleared with a {drug.halfLifeDays}-day half-life; the curve is the sum of every logged dose. Red dots mark injections.</p>
        <p style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }}>It uses published population averages, so individual levels vary. Use it to see trends, not to make dosing decisions.</p>
      </div>
    </div>
  );
}
