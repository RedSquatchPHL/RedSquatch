'use client';

import { useState } from 'react';
import { Droplets, Utensils, Pencil, Trash2, Check, X } from 'lucide-react';
import { num, dayKey, toLocalInput, inputStyle, ghostBtn, primaryBtn, Field } from './shared';

export interface HydrationRow { id: number; logged_at: string; ounces: string | number; drink_name: string | null; notes: string | null }
// A protein row is also a food entry once it came through the intake form; quick-adds leave the extras null.
export interface ProteinRow {
  id: number; logged_at: string; grams: string | number; notes: string | null;
  food_name: string | null; fat_g: string | number | null; carbs_g: string | number | null; calories: string | number | null;
}

interface Entries<T> {
  entries: T[];
  update: (id: number, body: Record<string, unknown>) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

type Item =
  | { type: 'h'; id: number; at: string; row: HydrationRow }
  | { type: 'f'; id: number; at: string; row: ProteinRow };

interface Draft { at: string; name: string; amount: string; fat: string; carbs: string; cal: string }

const r1 = (n: number) => Math.round(n * 10) / 10;
const show = (v: unknown) => { const n = num(v); return n === null ? '' : String(n); };

// "" means "not recorded" (stored NULL); anything else must be a non-negative number.
function optNonNeg(s: string): number | null | undefined {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const muted = { color: 'rgba(var(--rs-accent-rgb),0.6)' } as const;

// One merged, time-ordered log for a day: water rows (blue) and food rows together,
// each editable in full or deletable.
export default function NutritionDayLog({ day, hydration, protein }: {
  day: string; hydration: Entries<HydrationRow>; protein: Entries<ProteinRow>;
}) {
  const [editing, setEditing] = useState<{ item: Item; d: Draft } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items: Item[] = [
    ...hydration.entries.filter(r => dayKey(r.logged_at) === day).map((row): Item => ({ type: 'h', id: row.id, at: row.logged_at, row })),
    ...protein.entries.filter(r => dayKey(r.logged_at) === day).map((row): Item => ({ type: 'f', id: row.id, at: row.logged_at, row })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || a.type.localeCompare(b.type));

  const keyOf = (i: Item) => `${i.type}-${i.id}`;

  function startEdit(item: Item) {
    setErr(null); setDeleting(null);
    setEditing({
      item,
      d: item.type === 'h'
        ? { at: toLocalInput(item.at), name: item.row.drink_name ?? '', amount: show(item.row.ounces), fat: '', carbs: '', cal: '' }
        : { at: toLocalInput(item.at), name: item.row.food_name ?? '', amount: show(item.row.grams), fat: show(item.row.fat_g), carbs: show(item.row.carbs_g), cal: show(item.row.calories) },
    });
  }

  async function save() {
    if (!editing) return;
    const { item, d } = editing;
    const when = new Date(d.at);
    if (Number.isNaN(when.getTime())) { setErr('Pick a valid date and time.'); return; }
    const amount = Number(d.amount);
    setBusy(true);
    try {
      if (item.type === 'h') {
        if (!d.amount.trim() || !Number.isFinite(amount) || amount <= 0) { setErr('Enter a positive number of ounces.'); return; }
        // PUT replaces every column, so send notes back unchanged.
        await hydration.update(item.id, { ounces: amount, drink_name: d.name.trim() || null, logged_at: when.toISOString(), notes: item.row.notes });
      } else {
        const fat = optNonNeg(d.fat), carbs = optNonNeg(d.carbs), cal = optNonNeg(d.cal);
        if (!d.amount.trim() || !Number.isFinite(amount) || amount < 0) { setErr('Enter protein as 0 or more grams.'); return; }
        if (fat === undefined || carbs === undefined || cal === undefined) { setErr('Fat, carbs and calories must be blank or 0 or more.'); return; }
        await protein.update(item.id, { grams: amount, food_name: d.name.trim() || null, fat_g: fat, carbs_g: carbs, calories: cal, logged_at: when.toISOString(), notes: item.row.notes });
      }
      setEditing(null); setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save the change.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    setBusy(true);
    try {
      await (item.type === 'h' ? hydration.remove(item.id) : protein.remove(item.id));
      setDeleting(null); setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete the entry.');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setEditing(x => x && ({ ...x, d: { ...x.d, [k]: e.target.value } }));
  const inp = 'w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded';

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={muted}>Day log</div>
      {err && <p className="text-xs mb-2 text-[color:var(--rs-bad)]" role="alert">{err}</p>}
      <ul className="rounded-md overflow-hidden" style={{ border: '1px solid rgba(var(--rs-edge-rgb),0.2)' }}>
        {items.length === 0 && <li className="px-3 py-3 text-xs" style={muted}>Nothing logged.</li>}
        {items.map(item => {
          const water = item.type === 'h';
          const isEditing = editing && keyOf(editing.item) === keyOf(item);
          const row = item.row;
          const time = new Date(item.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          return (
            <li key={keyOf(item)} style={{
              borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.12)',
              background: water ? 'color-mix(in srgb, var(--rs-info) 10%, transparent)' : 'transparent',
            }}>
              {isEditing ? (
                <div className="p-3 grid gap-3">
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Date & time"><input type="datetime-local" value={editing.d.at} onChange={set('at')} className={inp} style={inputStyle} /></Field>
                    <div className="md:col-span-2">
                      <Field label={water ? 'Drink' : 'Food'}><input value={editing.d.name} onChange={set('name')} className={inp} style={inputStyle} /></Field>
                    </div>
                    <Field label={water ? 'Ounces' : 'Protein (g)'}><input value={editing.d.amount} onChange={set('amount')} inputMode="decimal" className={inp} style={inputStyle} /></Field>
                    {!water && <>
                      <Field label="Fat (g)"><input value={editing.d.fat} onChange={set('fat')} inputMode="decimal" className={inp} style={inputStyle} /></Field>
                      <Field label="Carbs (g)"><input value={editing.d.carbs} onChange={set('carbs')} inputMode="decimal" className={inp} style={inputStyle} /></Field>
                      <Field label="Calories"><input value={editing.d.cal} onChange={set('cal')} inputMode="decimal" className={inp} style={inputStyle} /></Field>
                    </>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={save} className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold disabled:opacity-40" style={primaryBtn}><Check size={14} /> Save</button>
                    <button type="button" disabled={busy} onClick={() => { setEditing(null); setErr(null); }} className="flex items-center gap-1 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}><X size={14} /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 min-w-[78px] text-xs" style={muted}>
                    {water ? <Droplets size={13} style={{ color: 'var(--rs-info)' }} /> : <Utensils size={13} style={{ color: 'var(--rs-accent)' }} />}
                    {time}
                  </span>
                  {water ? (
                    <>
                      <strong style={{ color: 'var(--rs-info)' }}>{show((row as HydrationRow).ounces)} oz</strong>
                      <span style={{ color: 'var(--rs-info)' }}>{(row as HydrationRow).drink_name ?? 'Water'}</span>
                    </>
                  ) : (() => {
                    const p = row as ProteinRow;
                    return (
                      <>
                        <strong>{show(p.grams)} g</strong>
                        {p.food_name && <span>{p.food_name}</span>}
                        {p.calories !== null && (
                          <span className="text-xs" style={muted}>{show(p.calories)} cal · F {show(p.fat_g) || 0}g · C {show(p.carbs_g) || 0}g</span>
                        )}
                      </>
                    );
                  })()}
                  <span className="ml-auto flex items-center gap-1">
                    {deleting === keyOf(item) ? (
                      <>
                        <span className="text-xs mr-1" style={muted}>Delete?</span>
                        <button type="button" disabled={busy} onClick={() => remove(item)} className="px-2.5 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40" style={{ background: 'var(--rs-bad)', color: '#fff' }}>Delete</button>
                        <button type="button" onClick={() => setDeleting(null)} className="px-2.5 py-1.5 rounded-md text-xs font-semibold border" style={ghostBtn}>Keep</button>
                      </>
                    ) : (
                      <>
                        <button type="button" aria-label="Edit entry" onClick={() => startEdit(item)} className="p-2 rounded-md"><Pencil size={14} /></button>
                        <button type="button" aria-label="Delete entry" onClick={() => { setDeleting(keyOf(item)); setEditing(null); setErr(null); }} className="p-2 rounded-md"><Trash2 size={14} /></button>
                      </>
                    )}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
