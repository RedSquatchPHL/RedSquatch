'use client';

import { useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/api';

const BASE = `${API}/api/client/glp1`;

export async function glp1Fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    let msg = 'Request failed — check your connection.';
    try {
      const data = await res.json();
      if (typeof data?.error === 'string') msg = data.error;
    } catch {
      // non-JSON body — keep the generic message
    }
    throw new Error(msg);
  }
  return res.json();
}

// Itemised log hook: loads `{ entries }` from `path` and exposes add/update/remove
// that keep local state in sync with the server's response.
export function useEntries<T extends { id: number }>(path: string) {
  const [entries, setEntries] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await glp1Fetch<{ entries: T[] }>(path);
      setEntries(data.entries);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load entries.');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { reload(); }, [reload]);

  async function add(body: Record<string, unknown>) {
    await glp1Fetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
    await reload();
  }

  async function update(id: number, body: Record<string, unknown>) {
    await glp1Fetch<T>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    await reload();
  }

  async function remove(id: number) {
    await glp1Fetch<{ success: boolean }>(`${path}/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return { entries, loading, error, add, update, remove, reload };
}

export interface Profile {
  height_in: number | null;
  target_weight_lb: number | null;
  hydration_goal_oz: number;
  protein_goal_g: number | null;
}

// Postgres NUMERIC comes back from node-pg as a string; normalise to number|null.
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    glp1Fetch<Record<string, unknown>>('/profile')
      .then(p => setProfile({
        height_in: num(p.height_in),
        target_weight_lb: num(p.target_weight_lb),
        hydration_goal_oz: num(p.hydration_goal_oz) ?? 64,
        protein_goal_g: num(p.protein_goal_g),
      }))
      .catch(() => setProfile({ height_in: null, target_weight_lb: null, hydration_goal_oz: 64, protein_goal_g: null }));
  }, []);

  async function save(next: Profile) {
    const saved = await glp1Fetch<Record<string, unknown>>('/profile', { method: 'PUT', body: JSON.stringify(next) });
    setProfile({
      height_in: num(saved.height_in),
      target_weight_lb: num(saved.target_weight_lb),
      hydration_goal_oz: num(saved.hydration_goal_oz) ?? 64,
      protein_goal_g: num(saved.protein_goal_g),
    });
  }

  return { profile, save };
}

// ── Dates ────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

// Value for <input type="datetime-local"> in the viewer's local time.
export function toLocalInput(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

// Calendar-day key (YYYY-MM-DD) in the viewer's local time.
export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtShort(t: number | string): string {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Styling (same copper vocabulary as BloodPressureTracker) ─────────────────

export const inputStyle: React.CSSProperties = {
  borderColor: 'rgba(var(--copper-bold-rgb),0.3)',
  color: 'var(--copper-tan)',
  background: 'transparent',
};

export const panelStyle: React.CSSProperties = {
  background: 'rgba(20,18,16,0.6)',
  border: '1px solid rgba(184,115,51,0.2)',
};

export const primaryBtn: React.CSSProperties = { background: 'var(--copper-bold)', color: 'var(--stone-0)' };

export const ghostBtn: React.CSSProperties = {
  borderColor: 'rgba(var(--copper-bold-rgb),0.3)',
  color: 'var(--copper-tan)',
};

export const axisStyle = { fill: 'rgba(212,163,115,0.5)', fontSize: 11 };
export const gridStyle = { stroke: 'rgba(184,115,51,0.1)' };

export const tooltipBox: React.CSSProperties = {
  backgroundColor: 'rgba(20,18,16,0.95)',
  border: '1px solid rgba(184,115,51,0.3)',
  borderRadius: 6,
  color: 'var(--copper-tan)',
  fontSize: 12,
  padding: '8px 12px',
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>{label}</label>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-md p-3" style={panelStyle}>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }}>{label}</div>
      <div className="text-xl font-bold mt-0.5" style={{ color: color ?? 'var(--copper-tan)' }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>{sub}</div>}
    </div>
  );
}

export function ModuleHeader({ title, blurb, error }: { title: string; blurb: string; error?: string | null }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold" style={{ color: 'var(--copper-tan)', textShadow: '0 0 16px rgba(var(--copper-bold-rgb),0.3)' }}>{title}</h2>
      <p className="text-xs mt-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }}>{blurb}</p>
      {error && <p className="text-xs mt-1 text-red-400">{error}</p>}
    </div>
  );
}

export function Loading() {
  return <div className="py-12 text-center" style={{ color: 'var(--copper-tan)' }}>Loading…</div>;
}
