'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2, Check, X, Syringe } from 'lucide-react';
import {
  DRUGS, MEDICATIONS, SITES, SITE_LABEL, recommendNextSite, siteStatuses, typicalIntervalDays,
  type Medication, type Site,
} from '@/lib/glp1';
import {
  useEntries, num, toLocalInput, fmtDateTime,
  inputStyle, panelStyle, primaryBtn, ghostBtn, Field, ModuleHeader, Loading, GroupedRows, LockToggle,
} from './shared';
import BodyMap from './BodyMap';

export interface InjectionRow {
  id: number;
  injected_at: string;
  medication: Medication;
  dose_mg: string | number;
  site: Site;
  notes: string | null;
}

const DAY = 86400000;

export default function InjectionTracker() {
  const { entries, loading, error, add, update, remove } = useEntries<InjectionRow>('/injections');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ medication: Medication; dose_mg: string; site: Site | ''; injected_at: string; notes: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [reveal, setReveal] = useState<{ t: number; nonce: number } | null>(null);

  const history = useMemo(
    () => entries.map(e => ({ site: e.site, t: new Date(e.injected_at).getTime() })),
    [entries]
  );
  const statuses = useMemo(() => siteStatuses(history), [history]);
  const recommended = entries.length ? recommendNextSite(history) : null;

  if (loading) return <Loading />;

  const latest = entries[0] ?? null; // API returns newest first
  const interval = typicalIntervalDays(entries.map(e => new Date(e.injected_at).getTime()));
  const dueAt = latest ? new Date(latest.injected_at).getTime() + interval * DAY : null;
  const daysUntil = dueAt !== null ? Math.round((dueAt - Date.now()) / DAY) : null;

  function blankForm() {
    return {
      medication: latest?.medication ?? ('tirzepatide' as Medication),
      dose_mg: latest ? String(num(latest.dose_mg) ?? '') : '',
      site: (recommended ?? '') as Site | '',
      injected_at: toLocalInput(new Date()),
      notes: '',
    };
  }

  function openNew() { setEditingId(null); setForm(blankForm()); setFormError(null); }

  function openEdit(r: InjectionRow) {
    setEditingId(r.id);
    setForm({ medication: r.medication, dose_mg: String(num(r.dose_mg) ?? ''), site: r.site, injected_at: toLocalInput(r.injected_at), notes: r.notes ?? '' });
    setFormError(null);
  }

  function toggleLock() {
    if (!locked) { setForm(null); setEditingId(null); }
    setLocked(l => !l);
  }

  async function submit() {
    if (!form) return;
    const dose = Number(form.dose_mg);
    if (!form.dose_mg.trim() || !Number.isFinite(dose) || dose <= 0) { setFormError('Enter the dose in mg.'); return; }
    if (!form.site) { setFormError('Pick an injection site (tap the body map or use the list).'); return; }
    const body = {
      medication: form.medication, dose_mg: dose, site: form.site,
      injected_at: new Date(form.injected_at).toISOString(), notes: form.notes.trim() || null,
    };
    try {
      if (editingId !== null) await update(editingId, body); else await add(body);
      setReveal({ t: new Date(form.injected_at).getTime(), nonce: Date.now() });
      setForm(null);
      setEditingId(null);
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save.');
    }
  }

  let reminder = 'Log your first dose to start site rotation and reminders.';
  let reminderColor = 'rgba(var(--rs-accent-rgb),0.7)';
  if (daysUntil !== null && dueAt !== null) {
    const dueStr = new Date(dueAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (daysUntil < 0) { reminder = `Overdue by ${-daysUntil} day${daysUntil === -1 ? '' : 's'} (was due ${dueStr}).`; reminderColor = 'var(--rs-bad)'; }
    else if (daysUntil === 0) { reminder = `Due today (${dueStr}).`; reminderColor = 'var(--rs-warn)'; }
    else { reminder = `Next dose in ${daysUntil} day${daysUntil === 1 ? '' : 's'} — ${dueStr}.`; reminderColor = 'var(--rs-ok)'; }
  }

  return (
    <div style={{ color: 'var(--rs-accent)' }}>
      <ModuleHeader title="Injections" blurb="Log doses, rotate sites with the body map, and review your history." error={error ?? formError} />

      <div className="rounded-md p-3 mb-4 text-sm font-semibold flex items-center gap-2" style={{ ...panelStyle, color: reminderColor }}>
        <Syringe size={15} /> {reminder}
        {latest && <span className="ml-auto text-xs font-normal" style={{ color: 'rgba(var(--rs-accent-rgb),0.55)' }}>typical gap {interval.toFixed(1)} d</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Log form */}
        <div className="rounded-md p-4 space-y-3" style={panelStyle}>
          {form ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">{editingId !== null ? 'Edit injection' : 'Log an injection'}</h3>
                <button type="button" aria-label="Close" onClick={() => { setForm(null); setEditingId(null); }} style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Medication">
                  <select value={form.medication} onChange={e => setForm(f => f && ({ ...f, medication: e.target.value as Medication }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                    {MEDICATIONS.map(m => <option key={m} value={m} style={{ color: '#000' }}>{DRUGS[m].label}</option>)}
                  </select>
                </Field>
                <Field label="Dose (mg)">
                  <input value={form.dose_mg} onChange={e => setForm(f => f && ({ ...f, dose_mg: e.target.value }))} inputMode="decimal" placeholder="e.g. 5" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
                </Field>
              </div>
              <Field label="Site">
                <select value={form.site} onChange={e => setForm(f => f && ({ ...f, site: e.target.value as Site }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                  <option value="" style={{ color: '#000' }}>Select…</option>
                  {SITES.map(s => <option key={s} value={s} style={{ color: '#000' }}>{SITE_LABEL[s]}{s === recommended ? ' (suggested)' : ''}</option>)}
                </select>
              </Field>
              <Field label="Date/Time">
                <input type="datetime-local" value={form.injected_at} onChange={e => setForm(f => f && ({ ...f, injected_at: e.target.value }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
              </Field>
              <Field label="Notes (optional)">
                <input value={form.notes} onChange={e => setForm(f => f && ({ ...f, notes: e.target.value }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
              </Field>
              <div className="flex gap-2">
                <button type="button" onClick={submit} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold" style={primaryBtn}><Check size={14} /> {editingId !== null ? 'Save changes' : 'Log injection'}</button>
                <button type="button" onClick={() => { setForm(null); setEditingId(null); }} className="px-4 py-2 rounded-md text-sm font-semibold border" style={ghostBtn}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>Tap a zone on the body map, or start a blank entry.</p>
              <button type="button" onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold" style={primaryBtn}><Syringe size={14} /> Log injection</button>
            </div>
          )}
        </div>
        {/* Site guide */}
        <div className="rounded-md p-4" style={panelStyle}>
          <h3 className="text-sm font-bold mb-2">Site rotation guide</h3>
          <BodyMap
            statuses={statuses}
            recommended={recommended}
            selected={form?.site || null}
            onSelect={site => { if (!form) { setEditingId(null); setForm({ ...blankForm(), site }); setFormError(null); } else setForm(f => f && ({ ...f, site })); }}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] mt-2" style={{ color: 'rgba(var(--rs-accent-rgb),0.65)' }}>
            <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--rs-bad)' }} />&lt; 7 d</span>
            <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--rs-warn)' }} />7–14 d</span>
            <span><i className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--rs-ok)' }} />14 d+ / never</span>
            <span>dashed = suggested next</span>
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {statuses.map(s => (
              <li key={s.site} className="flex justify-between" style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)', paddingBottom: 2 }}>
                <span>{SITE_LABEL[s.site]}{s.site === recommended && <span style={{ color: 'var(--rs-accent)' }}> ← next</span>}</span>
                <span style={{ color: 'rgba(var(--rs-accent-rgb),0.6)' }}>
                  {s.lastUsed ? new Date(s.lastUsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'never'} · {s.uses}×
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">History</h3>
        {entries.length > 0 && <LockToggle locked={locked} onToggle={toggleLock} noun="injections" />}
      </div>
      {entries.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'rgba(var(--rs-accent-rgb),0.55)' }}>No injections logged yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-md" style={{ background: 'var(--rs-well)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(var(--rs-edge-rgb),0.2)' }}>
                <th className="text-left px-3 py-2">Date/Time</th>
                <th className="text-left px-3 py-2">Medication</th>
                <th className="text-left px-3 py-2">Dose</th>
                <th className="text-left px-3 py-2">Site</th>
                <th className="text-left px-3 py-2">Notes</th>
                {!locked && <th className="text-right px-3 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              <GroupedRows
                rows={entries}
                getTime={r => new Date(r.injected_at).getTime()}
                colSpan={locked ? 5 : 6}
                noun="injection"
                reveal={reveal}
                renderRow={r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
                    <td className="px-3 py-2 pl-10">{fmtDateTime(r.injected_at)}</td>
                    <td className="px-3 py-2">{DRUGS[r.medication]?.label ?? r.medication}</td>
                    <td className="px-3 py-2 font-semibold">{num(r.dose_mg)} mg</td>
                    <td className="px-3 py-2">{SITE_LABEL[r.site] ?? r.site}</td>
                    <td className="px-3 py-2" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>{r.notes ?? ''}</td>
                    {!locked && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button type="button" aria-label="Edit" onClick={() => openEdit(r)} className="p-1"><Pencil size={13} /></button>
                        <button type="button" aria-label="Delete" className="p-1 ml-1"
                          onClick={() => { if (confirm('Delete this injection?')) remove(r.id).catch(() => setFormError('Failed to delete.')); }}><Trash2 size={13} /></button>
                      </td>
                    )}
                  </tr>
                )}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
