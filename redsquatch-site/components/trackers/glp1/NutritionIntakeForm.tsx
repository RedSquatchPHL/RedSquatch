'use client';

import { useMemo, useState } from 'react';
import { Droplets, Utensils, X, Check } from 'lucide-react';
import {
  useEntries, glp1Fetch, num, dayKey,
  inputStyle, panelStyle, primaryBtn, ghostBtn,
  Field, ModuleHeader, Loading,
} from './shared';

interface FoodRow {
  id: number; name: string; serving: string | null; volume_oz: string | number | null;
  protein_g: string | number; fat_g: string | number; carbs_g: string | number; calories: string | number;
}

interface Macros { protein: number; fat: number; carbs: number; calories: number }

// One staged item waiting for Submit. Macros (and a drink's ounces) are already scaled
// by servings, because that is what the logs store (a logged amount, not a per-serving
// definition). A drink with macros (protein shake) is logged as two rows: ounces to
// hydration and macros to the protein log.
type Staged =
  | { kind: 'hydration'; drink: string; servings: number; ounces: number; macros: Macros | null; newDrink: { perOz: number; per: Macros } | null }
  | { kind: 'food'; name: string; servings: number; macros: Macros; newFood: { serving: string | null; per: Macros } | null };

const r1 = (n: number) => Math.round(n * 10) / 10;
const pad = (n: number) => String(n).padStart(2, '0');
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Blank is "not entered"; 0 is a real answer (an apple has 0 g of protein).
function parseNonNeg(s: string): number | null {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function macroLine(m: Macros): string {
  return `${r1(m.calories)} cal · P ${r1(m.protein)}g · F ${r1(m.fat)}g · C ${r1(m.carbs)}g`;
}

const muted = { color: 'rgba(var(--rs-accent-rgb),0.6)' } as const;

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-md text-sm font-semibold ${active ? '' : 'border'}`}
      style={active ? primaryBtn : ghostBtn}>
      {children}
    </button>
  );
}

export default function NutritionIntakeForm({ onViewLog }: { onViewLog?: () => void }) {
  const foods = useEntries<FoodRow>('/foods');

  const [date, setDate] = useState(dayKey(new Date()));
  const [time, setTime] = useState(nowHM());

  const [kind, setKind] = useState<'hydration' | 'food' | null>(null);
  const [drink, setDrink] = useState('');
  const [ounces, setOunces] = useState('');
  const [hasMacros, setHasMacros] = useState(false);
  const [dm, setDm] = useState({ protein: '', fat: '', carbs: '', calories: '' });
  const [dServ, setDServ] = useState('1');
  const [saveDrink, setSaveDrink] = useState(true);
  const [pickedDrinkId, setPickedDrinkId] = useState<number | null>(null);

  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [nf, setNf] = useState({ name: '', serving: '', protein: '', fat: '', carbs: '', calories: '' });
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [servings, setServings] = useState('1');

  const [more, setMore] = useState(false);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  // Alphabetical, case-insensitive; typing narrows the list.
  const byName = (a: FoodRow, b: FoodRow) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  // Saved items with a volume are drinks: they go in the hydration picker, not the food list.
  const sortedFoods = useMemo(() => foods.entries.filter(f => f.volume_oz === null).sort(byName), [foods.entries]);
  const sortedDrinks = useMemo(() => foods.entries.filter(f => f.volume_oz !== null).sort(byName), [foods.entries]);
  const drinkMatches = useMemo(() => {
    const q = drink.trim().toLowerCase();
    return q ? sortedDrinks.filter(d => d.name.toLowerCase().includes(q)) : sortedDrinks;
  }, [sortedDrinks, drink]);
  const pickedDrink = sortedDrinks.find(d => d.id === pickedDrinkId) ?? null;
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? sortedFoods.filter(f => f.name.toLowerCase().includes(q)) : sortedFoods;
  }, [sortedFoods, search]);

  const picked = sortedFoods.find(f => f.id === pickedId) ?? null;

  // The item currently on the form, or null while it is incomplete.
  const current: Staged | null = useMemo(() => {
    if (kind === 'hydration') {
      const oz = num(ounces);
      if (!drink.trim() || !oz || oz <= 0) return null;
      if (!hasMacros) return { kind: 'hydration', drink: drink.trim(), servings: 1, ounces: oz, macros: null, newDrink: null };
      const per = { protein: parseNonNeg(dm.protein), fat: parseNonNeg(dm.fat), carbs: parseNonNeg(dm.carbs), calories: parseNonNeg(dm.calories) };
      const sv = num(dServ);
      if (!sv || sv <= 0 || per.protein === null || per.fat === null || per.carbs === null || per.calories === null) return null;
      const full = per as Macros;
      return {
        kind: 'hydration', drink: drink.trim(), servings: sv, ounces: oz * sv, macros: scale(full, sv),
        newDrink: saveDrink && !pickedDrink ? { perOz: oz, per: full } : null,
      };
    }
    if (kind === 'food') {
      const sv = num(servings);
      if (!sv || sv <= 0) return null;
      if (isNew === false) {
        if (!picked) return null;
        const per = { protein: num(picked.protein_g) ?? 0, fat: num(picked.fat_g) ?? 0, carbs: num(picked.carbs_g) ?? 0, calories: num(picked.calories) ?? 0 };
        return { kind: 'food', name: picked.name, servings: sv, macros: scale(per, sv), newFood: null };
      }
      if (isNew === true) {
        const per = { protein: parseNonNeg(nf.protein), fat: parseNonNeg(nf.fat), carbs: parseNonNeg(nf.carbs), calories: parseNonNeg(nf.calories) };
        if (!nf.name.trim() || per.protein === null || per.fat === null || per.carbs === null || per.calories === null) return null;
        const full = per as Macros;
        return { kind: 'food', name: nf.name.trim(), servings: sv, macros: scale(full, sv), newFood: { serving: nf.serving.trim() || null, per: full } };
      }
    }
    return null;
  }, [kind, drink, ounces, hasMacros, dm, dServ, saveDrink, pickedDrink, isNew, nf, picked, servings]);

  function scale(m: Macros, sv: number): Macros {
    return { protein: m.protein * sv, fat: m.fat * sv, carbs: m.carbs * sv, calories: m.calories * sv };
  }

  function resetItem() {
    setKind(null); setDrink(''); setOunces('');
    setHasMacros(false); setDm({ protein: '', fat: '', carbs: '', calories: '' }); setDServ('1'); setSaveDrink(true); setPickedDrinkId(null);
    setIsNew(null); setNf({ name: '', serving: '', protein: '', fat: '', carbs: '', calories: '' });
    setSearch(''); setPickedId(null); setServings('1');
  }

  // A staged-only Submit is allowed when the form is untouched, so unticking
  // "add more items?" on a blank form submits what is already in the list.
  const canSubmit = !busy && (current !== null || (kind === null && staged.length > 0));

  function stageCurrent(): Staged[] {
    return current ? [...staged, current] : staged;
  }

  function onPrimary() {
    setErr(null);
    setDoneCount(null);
    if (more && current) {
      setStaged(stageCurrent());
      resetItem();
      return;
    }
    submit(stageCurrent());
  }

  async function submit(items: Staged[]) {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if (!y || Number.isNaN(hh)) { setErr('Pick a date and time.'); return; }
    const at = new Date(y, m - 1, d, hh, mm).toISOString();

    setBusy(true);
    try {
      // One request, one transaction: nothing reaches the log unless every item does.
      await glp1Fetch('/intake', { method: 'POST', body: JSON.stringify({
        logged_at: at,
        items: items.map(it => it.kind === 'hydration'
          ? {
              kind: 'hydration', ounces: r1(it.ounces),
              drink_name: it.servings === 1 ? it.drink : `${it.drink} ×${it.servings}`,
              macros: it.macros && { grams: r1(it.macros.protein), fat_g: r1(it.macros.fat), carbs_g: r1(it.macros.carbs), calories: r1(it.macros.calories) },
              save_drink: it.newDrink && { name: it.drink, volume_oz: it.newDrink.perOz, protein_g: it.newDrink.per.protein, fat_g: it.newDrink.per.fat, carbs_g: it.newDrink.per.carbs, calories: it.newDrink.per.calories },
            }
          : {
              kind: 'food', name: it.name,
              grams: r1(it.macros.protein), fat_g: r1(it.macros.fat), carbs_g: r1(it.macros.carbs), calories: r1(it.macros.calories),
              food_name: it.servings === 1 ? it.name : `${it.name} ×${it.servings}`,
              save_food: it.newFood && { serving: it.newFood.serving, protein_g: it.newFood.per.protein, fat_g: it.newFood.per.fat, carbs_g: it.newFood.per.carbs, calories: it.newFood.per.calories },
            }),
      }) });
      setStaged([]);
      resetItem();
      setMore(false);
      setTime(nowHM());
      setDoneCount(items.length);
      foods.reload();
    } catch (e) {
      // Nothing was saved; keep everything on screen so the user can retry.
      setErr(`${e instanceof Error ? e.message : 'Failed.'} Nothing was logged — your items are still here.`);
    } finally {
      setBusy(false);
    }
  }

  if (foods.loading) return <Loading />;

  const itemLabel = (s: Staged) => s.kind === 'hydration'
    ? `${r1(s.ounces)} oz ${s.drink}${s.servings !== 1 ? ` ×${s.servings}` : ''}${s.macros ? ` — ${macroLine(s.macros)}` : ''}`
    : `${s.name}${s.servings !== 1 ? ` ×${s.servings}` : ''} — ${macroLine(s.macros)}`;

  return (
    <div style={{ color: 'var(--rs-accent)' }}>
      <ModuleHeader title="Nutrition Intake" blurb="Log what you drank or ate. Entries land in Hydration & Protein." error={foods.error} />

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 mb-4 sm:max-w-sm">
        <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
        <Field label="Time"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
      </div>

      <div className="rounded-md p-3 sm:p-4 mb-4" style={panelStyle}>
        <div className="text-xs mb-2" style={muted}>Hydration or food?</div>
        <div className="flex gap-2">
          <Choice active={kind === 'hydration'} onClick={() => setKind('hydration')}><Droplets size={14} /> Hydration</Choice>
          <Choice active={kind === 'food'} onClick={() => setKind('food')}><Utensils size={14} /> Food</Choice>
        </div>

        {kind === 'hydration' && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:max-w-lg">
              <Field label="What did you drink?"><input value={drink} onChange={e => { setDrink(e.target.value); if (pickedDrink && e.target.value !== pickedDrink.name) setPickedDrinkId(null); }} placeholder="Water, protein shake…" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
              <Field label="How much? (oz)"><input value={ounces} onChange={e => setOunces(e.target.value)} inputMode="decimal" placeholder="12" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
            </div>

            {drinkMatches.length > 0 && (
              <div className="flex flex-wrap gap-2 my-3" aria-label="Saved drinks">
                {drinkMatches.map(d => (
                  <button key={d.id} type="button" aria-pressed={pickedDrinkId === d.id}
                    onClick={() => {
                      // A saved drink fills in its name, ounces and macros and turns macros on.
                      setPickedDrinkId(d.id); setDrink(d.name); setOunces(String(num(d.volume_oz) ?? ''));
                      setHasMacros(true);
                      setDm({ protein: String(num(d.protein_g) ?? 0), fat: String(num(d.fat_g) ?? 0), carbs: String(num(d.carbs_g) ?? 0), calories: String(num(d.calories) ?? 0) });
                    }}
                    className={`px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold ${pickedDrinkId === d.id ? '' : 'border'}`}
                    style={pickedDrinkId === d.id ? primaryBtn : ghostBtn}>
                    {d.name} · {num(d.volume_oz)} oz
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px] sm:min-h-0 mt-1">
              <input type="checkbox" checked={hasMacros} onChange={e => setHasMacros(e.target.checked)} />
              Has macros <span className="text-xs" style={muted}>(protein shake, milk…)</span>
            </label>

            {hasMacros && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {([['protein', 'Protein (g)'], ['fat', 'Fat (g)'], ['carbs', 'Carbs (g)'], ['calories', 'Calories']] as const).map(([k, label]) => (
                  <Field key={k} label={label}><input value={dm[k]} onChange={e => setDm(x => ({ ...x, [k]: e.target.value }))} inputMode="decimal" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
                ))}
                <Field label="Servings"><input value={dServ} onChange={e => setDServ(e.target.value)} inputMode="decimal" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
                {!pickedDrink && (
                  <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer min-h-[44px] sm:min-h-0">
                    <input type="checkbox" checked={saveDrink} onChange={e => setSaveDrink(e.target.checked)} /> Save to my drinks
                  </label>
                )}
                <p className="col-span-2 md:col-span-4 text-xs" style={muted}>Ounces and macros are per serving. The ounces count toward your water goal and the macros go in the food log.</p>
                {current?.kind === 'hydration' && current.macros && (
                  <p className="col-span-2 md:col-span-4 text-xs" style={muted}>This entry: <strong style={{ color: 'var(--rs-accent)' }}>{r1(current.ounces)} oz · {macroLine(current.macros)}</strong></p>
                )}
              </div>
            )}
          </div>
        )}

        {kind === 'food' && (
          <div className="mt-4">
            <div className="text-xs mb-2" style={muted}>Is this a new food?</div>
            <div className="flex gap-2">
              <Choice active={isNew === true} onClick={() => setIsNew(true)}>Yes</Choice>
              <Choice active={isNew === false} onClick={() => setIsNew(false)}>No</Choice>
            </div>

            {isNew === true && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="col-span-2 md:col-span-3">
                  <Field label="Name"><input value={nf.name} onChange={e => setNf(x => ({ ...x, name: e.target.value }))} placeholder="Greek yogurt" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
                </div>
                <Field label="Serving (optional)"><input value={nf.serving} onChange={e => setNf(x => ({ ...x, serving: e.target.value }))} placeholder="1 cup" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
                {([['protein', 'Protein (g)'], ['fat', 'Fat (g)'], ['carbs', 'Carbs (g)'], ['calories', 'Calories']] as const).map(([k, label]) => (
                  <Field key={k} label={label}><input value={nf[k]} onChange={e => setNf(x => ({ ...x, [k]: e.target.value }))} inputMode="decimal" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field>
                ))}
                <p className="col-span-2 md:col-span-4 text-xs" style={muted}>Macros are per serving. This food is saved to your list for next time.</p>
              </div>
            )}

            {isNew === false && (
              <div className="mt-4">
                {sortedFoods.length === 0 ? (
                  <p className="text-xs" style={muted}>No saved foods yet — choose “Yes” to add your first.</p>
                ) : (
                  <>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type to narrow the list…" aria-label="Search saved foods"
                      className="w-full sm:max-w-sm border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded mb-2" style={inputStyle} />
                    <ul className="max-h-56 sm:max-h-48 overflow-y-auto rounded-md" style={{ border: '1px solid rgba(var(--rs-edge-rgb),0.2)' }}>
                      {matches.length === 0 && <li className="px-3 py-2 text-xs" style={muted}>No match.</li>}
                      {matches.map(f => (
                        <li key={f.id}>
                          <button type="button" onClick={() => setPickedId(f.id)} aria-pressed={pickedId === f.id}
                            className="w-full flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2.5 sm:py-1.5 text-left text-sm"
                            style={{ background: pickedId === f.id ? 'rgba(var(--rs-accent-rgb),0.15)' : 'transparent', borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
                            {pickedId === f.id && <Check size={12} />}
                            <span className="font-semibold">{f.name}</span>
                            {f.serving && <span className="text-xs" style={muted}>({f.serving})</span>}
                            <span className="w-full sm:w-auto sm:ml-auto text-xs" style={muted}>
                              {macroLine({ protein: num(f.protein_g) ?? 0, fat: num(f.fat_g) ?? 0, carbs: num(f.carbs_g) ?? 0, calories: num(f.calories) ?? 0 })}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {isNew !== null && (isNew || picked) && (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="w-full min-[420px]:w-28"><Field label="Servings"><input value={servings} onChange={e => setServings(e.target.value)} inputMode="decimal" className="w-full border px-2 py-2 text-base sm:py-1.5 sm:text-sm rounded" style={inputStyle} /></Field></div>
                {current?.kind === 'food' && <div className="text-xs pb-2" style={muted}>This entry: <strong style={{ color: 'var(--rs-accent)' }}>{macroLine(current.macros)}</strong></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {staged.length > 0 && (
        <div className="rounded-md p-3 mb-4" style={panelStyle}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={muted}>Ready to submit ({staged.length})</div>
          <ul>
            {staged.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm py-1" style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
                {s.kind === 'hydration' ? <Droplets size={13} style={{ color: 'var(--rs-info)' }} /> : <Utensils size={13} />}
                <span>{itemLabel(s)}</span>
                <button type="button" aria-label="Remove item" className="ml-auto" onClick={() => setStaged(staged.filter((_, j) => j !== i))}><X size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 justify-between sm:static sm:m-0 sm:p-0 sm:justify-start bg-[var(--rs-well-solid)] border-t border-[rgba(var(--rs-edge-rgb),0.2)] sm:bg-transparent sm:border-0">
        <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px] sm:min-h-0">
          <input type="checkbox" checked={more} onChange={e => setMore(e.target.checked)} />
          Add more items?
        </label>
        <button type="button" disabled={!canSubmit} onClick={onPrimary}
          className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-md text-sm font-semibold disabled:opacity-40" style={primaryBtn}>
          {busy ? 'Saving…' : more ? 'Add item & continue' : staged.length > 0 ? `Submit ${staged.length + (current ? 1 : 0)} items` : 'Submit'}
        </button>
      </div>

      {err && <p className="text-xs mt-3 text-[color:var(--rs-bad)]">{err}</p>}
      {doneCount !== null && (
        <p className="text-sm mt-3" style={{ color: 'var(--rs-ok)' }}>
          Logged {doneCount} {doneCount === 1 ? 'item' : 'items'}.{' '}
          {onViewLog && <button type="button" onClick={onViewLog} className="underline" style={{ color: 'var(--rs-accent)' }}>View in Hydration & Protein</button>}
        </p>
      )}
    </div>
  );
}
