'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { Plus, Trash2, ChevronLeft, ChevronRight, BookOpen, ExternalLink, Star } from 'lucide-react';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';
import type React from 'react';

interface Rating { id: number; item: string; place: string; rating: number; notes: string | null; eaten_on: string; }
interface Meal {
  id: number; plan_date: string; meal_type: MealType; title: string;
  in_paprika: boolean; recipe_url: string | null; notes: string | null;
}
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const inputStyle: React.CSSProperties = {
  borderColor: 'var(--rs-field-edge)', color: 'var(--rs-ink)', background: 'var(--rs-field)',
};
const accentBtn: React.CSSProperties = {
  background: 'rgba(var(--rs-accent-rgb),0.2)', border: '1px solid rgba(var(--rs-accent-rgb),0.5)', color: 'var(--rs-accent)',
};
const mutedBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(var(--rs-accent-rgb),0.2)', color: 'var(--rs-ink-muted)',
};

// ---- local-time date helpers (toISOString would shift the day in the evening) ----
const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => new Date(s + 'T12:00:00');
const addDays = (iso: string, n: number) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
function mondayOf(d: Date) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return toISO(c);
}
const fmtShort = (iso: string) => fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/client/food${path}`, {
    credentials: 'include',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

function ratingColor(r: number) {
  if (r >= 8) return '#6fcf97';
  if (r >= 6) return 'var(--rs-accent)';
  if (r >= 4) return '#e0b050';
  return '#e06c6c';
}

// ───────────────────────── Ratings module ─────────────────────────

function RatingsModule() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState({ item: '', place: '', rating: 5, eaten_on: toISO(new Date()), notes: '' });

  const load = useCallback(async () => {
    try { setRatings((await api<{ ratings: Rating[] }>('/ratings')).ratings); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load ratings'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.item.trim() || !draft.place.trim()) return;
    setSaving(true);
    try {
      await api('/ratings', { method: 'POST', body: JSON.stringify(draft) });
      setDraft(d => ({ ...d, item: '', place: '', notes: '', rating: 5 }));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm('Delete this rating?')) return;
    try { await api(`/ratings/${id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); }
  }

  // Autocomplete lists so "cheesesteak" / "Glenside Pizza" stay spelled the same.
  const itemNames = useMemo(() => Array.from(new Set(ratings.map(r => r.item))).sort(), [ratings]);
  const placeNames = useMemo(() => Array.from(new Set(ratings.map(r => r.place))).sort(), [ratings]);

  // Leaderboard: for each item, average rating per place (case-insensitive grouping).
  const boards = useMemo(() => {
    const byItem = new Map<string, { label: string; places: Map<string, { label: string; sum: number; n: number }> }>();
    for (const r of ratings) {
      const ik = r.item.toLowerCase();
      const entry = byItem.get(ik) ?? { label: r.item, places: new Map() };
      const pk = r.place.toLowerCase();
      const p = entry.places.get(pk) ?? { label: r.place, sum: 0, n: 0 };
      p.sum += r.rating; p.n += 1;
      entry.places.set(pk, p); byItem.set(ik, entry);
    }
    return Array.from(byItem.values())
      .map(b => ({
        label: b.label,
        places: Array.from(b.places.values()).map(p => ({ label: p.label, avg: p.sum / p.n, n: p.n })).sort((a, b2) => b2.avg - a.avg),
      }))
      .filter(b => b.places.length > 0)
      .sort((a, b2) => b2.places.length - a.places.length || a.label.localeCompare(b2.label));
  }, [ratings]);

  const shown = ratings.filter(r => {
    const q = filter.trim().toLowerCase();
    return !q || r.item.toLowerCase().includes(q) || r.place.toLowerCase().includes(q);
  });

  return (
    <CopperPanel>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--rs-accent)' }}>Food Ratings</h2>
      <p className="text-xs font-mono mb-4" style={{ color: 'var(--rs-ink-muted)' }}>
        What you ate, where, and how it was. 1 = never again, 5 = fine, 10 = best I&apos;ve had.
      </p>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-6 gap-2 mb-4">
        <input list="food-items" className="border px-2 py-1.5 text-sm rounded sm:col-span-2" style={inputStyle}
          placeholder="What (cheesesteak)" value={draft.item} onChange={e => setDraft(d => ({ ...d, item: e.target.value }))} required />
        <input list="food-places" className="border px-2 py-1.5 text-sm rounded sm:col-span-2" style={inputStyle}
          placeholder="Where (Glenside Pizza)" value={draft.place} onChange={e => setDraft(d => ({ ...d, place: e.target.value }))} required />
        <label className="flex items-center gap-2 text-xs font-mono sm:col-span-1" style={{ color: 'var(--rs-ink-muted)' }}>
          <input type="range" min={1} max={10} value={draft.rating} className="w-full"
            onChange={e => setDraft(d => ({ ...d, rating: Number(e.target.value) }))} aria-label="Rating" />
          <span className="w-6 text-right font-bold" style={{ color: ratingColor(draft.rating) }}>{draft.rating}</span>
        </label>
        <input type="date" className="border px-2 py-1.5 text-sm rounded sm:col-span-1" style={inputStyle}
          value={draft.eaten_on} onChange={e => setDraft(d => ({ ...d, eaten_on: e.target.value }))} />
        <input className="border px-2 py-1.5 text-sm rounded sm:col-span-5" style={inputStyle}
          placeholder="Notes (OK but not great — bread was good, meat was bland)" value={draft.notes}
          onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
        <button type="submit" disabled={saving} className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-mono rounded disabled:opacity-40" style={accentBtn}>
          <Plus size={14} /> Add
        </button>
        <datalist id="food-items">{itemNames.map(n => <option key={n} value={n} />)}</datalist>
        <datalist id="food-places">{placeNames.map(n => <option key={n} value={n} />)}</datalist>
      </form>

      {error && <p className="text-xs font-mono mb-3" style={{ color: '#e06c6c' }}>{error}</p>}

      {boards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {boards.slice(0, 6).map(b => (
            <div key={b.label} className="p-3 rounded" style={{ background: 'var(--rs-field)', border: '1px solid rgba(var(--rs-accent-rgb),0.15)' }}>
              <div className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--rs-ink-muted)' }}>{b.label}</div>
              <ol className="space-y-1">
                {b.places.map((p, i) => (
                  <li key={p.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate" style={{ color: 'var(--rs-ink)' }}>
                      <span className="font-mono mr-2" style={{ color: 'var(--rs-ink-muted)' }}>{i + 1}.</span>{p.label}
                    </span>
                    <span className="font-mono whitespace-nowrap" style={{ color: ratingColor(p.avg) }}>
                      {p.avg.toFixed(1)}{p.n > 1 && <span style={{ color: 'var(--rs-ink-muted)' }}> ({p.n}×)</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {ratings.length > 0 && (
        <input className="border px-2 py-1.5 text-sm rounded w-full mb-2" style={inputStyle}
          placeholder="Filter by food or place…" value={filter} onChange={e => setFilter(e.target.value)} />
      )}

      <ul className="divide-y" style={{ borderColor: 'rgba(var(--rs-accent-rgb),0.12)' }}>
        {shown.map(r => (
          <li key={r.id} className="flex items-start gap-3 py-2" style={{ borderColor: 'rgba(var(--rs-accent-rgb),0.12)' }}>
            <span className="flex items-center gap-1 font-mono font-bold text-lg w-12 shrink-0" style={{ color: ratingColor(r.rating) }}>
              {r.rating}<Star size={11} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm" style={{ color: 'var(--rs-ink)' }}>
                <strong>{r.item}</strong> <span style={{ color: 'var(--rs-ink-muted)' }}>@ {r.place}</span>
              </div>
              {r.notes && <div className="text-xs mt-0.5" style={{ color: 'var(--rs-ink-muted)' }}>{r.notes}</div>}
            </div>
            <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--rs-ink-muted)' }}>{fmtShort(r.eaten_on)}</span>
            <button onClick={() => remove(r.id)} aria-label={`Delete rating for ${r.item}`} className="p-1 opacity-60 hover:opacity-100" style={{ color: 'var(--rs-ink-muted)' }}>
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {ratings.length === 0 && !error && (
          <li className="py-4 text-sm text-center" style={{ color: 'var(--rs-ink-muted)' }}>
            Nothing rated yet. Start with today&apos;s cheesesteak.
          </li>
        )}
      </ul>
    </CopperPanel>
  );
}

// ───────────────────────── Planner module ─────────────────────────

function PlannerModule() {
  const [start, setStart] = useState(() => mondayOf(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = toISO(new Date());
  const [draft, setDraft] = useState({ plan_date: today, meal_type: 'dinner' as MealType, title: '', in_paprika: false, recipe_url: '' });

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(start, i)), [start]);

  const load = useCallback(async () => {
    try {
      const r = await api<{ meals: Meal[] }>(`/meals?from=${start}&to=${addDays(start, 13)}`);
      setMeals(r.meals); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load plan'); }
  }, [start]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      await api('/meals', { method: 'POST', body: JSON.stringify({ ...draft, recipe_url: draft.recipe_url.trim() || null }) });
      setDraft(d => ({ ...d, title: '', recipe_url: '', in_paprika: false }));
      // Jump the window if the meal was planned outside it.
      if (draft.plan_date < start || draft.plan_date > addDays(start, 13)) setStart(mondayOf(fromISO(draft.plan_date)));
      else await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    setSaving(false);
  }

  async function togglePaprika(m: Meal) {
    const next = !m.in_paprika;
    setMeals(ms => ms.map(x => x.id === m.id ? { ...x, in_paprika: next } : x)); // optimistic
    try {
      await api(`/meals/${m.id}`, { method: 'PUT', body: JSON.stringify({ ...m, in_paprika: next }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      await load();
    }
  }

  async function remove(id: number) {
    try { await api(`/meals/${id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); }
  }

  const byDay = useMemo(() => {
    const m = new Map<string, Meal[]>();
    for (const meal of meals) m.set(meal.plan_date, [...(m.get(meal.plan_date) ?? []), meal]);
    return m;
  }, [meals]);

  const needRecipe = meals.filter(m => !m.in_paprika).length;

  return (
    <CopperPanel>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-xl font-bold" style={{ color: 'var(--rs-accent)' }}>Meal Planner</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setStart(s => addDays(s, -14))} aria-label="Previous two weeks" className="p-1.5 rounded hover:bg-white/10" style={{ color: 'var(--rs-ink-muted)' }}><ChevronLeft size={18} /></button>
          <button onClick={() => setStart(mondayOf(new Date()))} className="px-2 py-1 text-xs font-mono rounded" style={mutedBtn}>This week</button>
          <button onClick={() => setStart(s => addDays(s, 14))} aria-label="Next two weeks" className="p-1.5 rounded hover:bg-white/10" style={{ color: 'var(--rs-ink-muted)' }}><ChevronRight size={18} /></button>
        </div>
      </div>
      <p className="text-xs font-mono mb-4" style={{ color: 'var(--rs-ink-muted)' }}>
        {fmtShort(start)} – {fmtShort(addDays(start, 13))} · Paprika has no public API, so tick the book icon on meals you already have a recipe for.
        {meals.length > 0 && <> {needRecipe} of {meals.length} still need a recipe.</>}
      </p>

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-6 gap-2 mb-4">
        <input type="date" className="border px-2 py-1.5 text-sm rounded" style={inputStyle}
          value={draft.plan_date} onChange={e => setDraft(d => ({ ...d, plan_date: e.target.value }))} required />
        <select className="border px-2 py-1.5 text-sm rounded" style={inputStyle}
          value={draft.meal_type} onChange={e => setDraft(d => ({ ...d, meal_type: e.target.value as MealType }))}>
          {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="border px-2 py-1.5 text-sm rounded sm:col-span-2" style={inputStyle} placeholder="Meal (chicken tikka masala)"
          value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} required />
        <input className="border px-2 py-1.5 text-sm rounded sm:col-span-2" style={inputStyle} placeholder="Recipe link (optional)" type="url"
          value={draft.recipe_url} onChange={e => setDraft(d => ({ ...d, recipe_url: e.target.value }))} />
        <label className="flex items-center gap-2 text-xs font-mono sm:col-span-4" style={{ color: 'var(--rs-ink-muted)' }}>
          <input type="checkbox" checked={draft.in_paprika} onChange={e => setDraft(d => ({ ...d, in_paprika: e.target.checked }))} />
          I already have this recipe in Paprika
        </label>
        <button type="submit" disabled={saving} className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-mono rounded disabled:opacity-40 sm:col-span-2" style={accentBtn}>
          <Plus size={14} /> Add meal
        </button>
      </form>

      {error && <p className="text-xs font-mono mb-3" style={{ color: '#e06c6c' }}>{error}</p>}

      <div className="grid grid-cols-7 gap-px text-center mb-1">
        {WEEKDAYS.map(w => <div key={w} className="text-xs font-mono hidden md:block" style={{ color: 'var(--rs-ink-muted)' }}>{w}</div>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 gap-px" style={{ background: 'rgba(var(--rs-edge-rgb),0.08)' }}>
        {days.map(d => {
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          return (
            <div key={d} className="min-h-[88px] p-1.5" style={{ background: 'var(--rs-field)', outline: isToday ? '1px solid rgba(var(--rs-accent-rgb),0.55)' : 'none', outlineOffset: '-1px' }}>
              <div className="text-[11px] font-mono mb-1" style={{ color: isToday ? 'var(--rs-accent)' : 'var(--rs-ink-muted)', fontWeight: isToday ? 700 : 400 }}>
                <span className="md:hidden">{fromISO(d).toLocaleDateString('en-US', { weekday: 'short' })} </span>{fmtShort(d)}
              </div>
              <ul className="space-y-1">
                {list.map(m => (
                  <li key={m.id} className="group text-xs rounded p-1" style={{ background: 'rgba(var(--rs-accent-rgb),0.06)', border: '1px solid rgba(var(--rs-accent-rgb),0.15)' }}>
                    <div className="flex items-start justify-between gap-1">
                      <span style={{ color: 'var(--rs-ink)' }}>
                        {m.meal_type !== 'dinner' && <em className="not-italic font-mono opacity-60 mr-1">{m.meal_type.slice(0, 1).toUpperCase()}</em>}
                        {m.title}
                      </span>
                      <button onClick={() => remove(m.id)} aria-label={`Remove ${m.title}`} className="opacity-40 hover:opacity-100 shrink-0" style={{ color: 'var(--rs-ink-muted)' }}><Trash2 size={11} /></button>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button onClick={() => togglePaprika(m)} aria-pressed={m.in_paprika}
                        title={m.in_paprika ? 'Recipe is in Paprika' : 'No recipe in Paprika yet'}
                        className="flex items-center gap-1 text-[10px] font-mono"
                        style={{ color: m.in_paprika ? '#6fcf97' : 'var(--rs-ink-muted)' }}>
                        <BookOpen size={11} /> {m.in_paprika ? 'in Paprika' : 'need recipe'}
                      </button>
                      {m.recipe_url && (
                        <a href={m.recipe_url} target="_blank" rel="noopener noreferrer" aria-label={`Open recipe for ${m.title}`} style={{ color: 'var(--rs-ink-muted)' }}><ExternalLink size={11} /></a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </CopperPanel>
  );
}

// ───────────────────────── Page ─────────────────────────

export default function HSFoodPage() {
  const [loading, setLoading] = useState(true);
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

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4 md:p-6 space-y-5">
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>Food</h1>
        </CopperPanel>
      </div>
      <div className="w-full max-w-5xl"><PlannerModule /></div>
      <div className="w-full max-w-5xl"><RatingsModule /></div>
    </div>
  );
}
