'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, ExternalLink, Pencil, Trash2, ArrowUpDown } from 'lucide-react';
import { API } from '@/lib/api';

type Status = 'researching' | 'contacted' | 'ordered' | 'rejected';
type SourceType = 'compounded' | 'manufacturer_direct' | null;

interface Compounder {
  id: number;
  name: string;
  website_url: string | null;
  source_type: SourceType;
  vial_size_mg: string | number | null;
  price_usd: string | number | null;
  subscription_price_usd: string | number | null;
  subscription_interval: string | null;
  shipping_cost_usd: string | number | null;
  free_shipping_threshold_usd: string | number | null;
  telehealth_required: boolean;
  telehealth_cost_usd: string | number | null;
  labs_required: boolean;
  status: Status;
  notes: string | null;
  last_checked_at: string | null;
}

// pg returns NUMERIC columns as strings, so every price field needs this before
// it can be used in arithmetic or comparisons.
function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// This is the one spot in the tracker that actually decides "which vendor is
// cheapest" — and there's no single right answer. Raw $/mg is a fair default,
// but it ignores things only you know: how many vials you'll actually order,
// whether a one-time telehealth/labs fee is worth amortizing over your first
// few refills, or whether you'd pay a bit more to avoid a subscription lock-in.
// Adjust the math below to match how you actually want to compare vendors —
// e.g. fold in shipping, or divide telehealth_cost_usd across N expected refills.
function getEffectiveCostPerMg(c: Compounder): number | null {
  const price = toNum(c.price_usd);
  const vial = toNum(c.vial_size_mg);
  if (price === null || vial === null || vial === 0) return null;
  return price / vial;
}

const STATUS_STYLE: Record<Status, { bg: string; color: string; label: string }> = {
  researching: { bg: 'rgba(var(--copper-bold-rgb),0.18)', color: 'var(--copper-tan)', label: 'RESEARCHING' },
  contacted:   { bg: 'rgba(42,149,163,0.18)',              color: '#2a95a3',           label: 'CONTACTED' },
  ordered:     { bg: 'rgba(76,175,80,0.18)',                color: '#4caf50',           label: 'ORDERED' },
  rejected:    { bg: 'rgba(200,80,80,0.18)',                 color: '#c85050',           label: 'REJECTED' },
};

// Compounded (503A/503B pharmacy) vs. manufacturer-direct (brand Zepbound/Mounjaro
// via insurance, Medicare, or LillyDirect) are different purchasing paths with
// different fields that matter — this badge is just the "which world is this" flag.
const SOURCE_TYPE_STYLE: Record<'compounded' | 'manufacturer_direct', { bg: string; color: string; label: string }> = {
  compounded:          { bg: 'rgba(184,115,51,0.18)', color: '#d4a373', label: 'Compounded' },
  manufacturer_direct: { bg: 'rgba(90,130,200,0.18)', color: '#8fb0e8', label: 'Manufacturer' },
};

const money = (v: string | number | null) => {
  const n = toNum(v);
  return n === null ? '—' : `$${n.toFixed(2)}`;
};

const emptyForm = {
  name: '',
  website_url: '',
  source_type: '' as '' | 'compounded' | 'manufacturer_direct',
  vial_size_mg: '',
  price_usd: '',
  subscription_price_usd: '',
  subscription_interval: '',
  shipping_cost_usd: '',
  free_shipping_threshold_usd: '',
  telehealth_required: false,
  telehealth_cost_usd: '',
  labs_required: false,
  status: 'researching' as Status,
  notes: '',
};

type FormState = typeof emptyForm;

function toFormState(c: Compounder): FormState {
  return {
    name: c.name,
    website_url: c.website_url ?? '',
    source_type: c.source_type ?? '',
    vial_size_mg: c.vial_size_mg?.toString() ?? '',
    price_usd: c.price_usd?.toString() ?? '',
    subscription_price_usd: c.subscription_price_usd?.toString() ?? '',
    subscription_interval: c.subscription_interval ?? '',
    shipping_cost_usd: c.shipping_cost_usd?.toString() ?? '',
    free_shipping_threshold_usd: c.free_shipping_threshold_usd?.toString() ?? '',
    telehealth_required: c.telehealth_required,
    telehealth_cost_usd: c.telehealth_cost_usd?.toString() ?? '',
    labs_required: c.labs_required,
    status: c.status,
    notes: c.notes ?? '',
  };
}

const NUMERIC_KEYS: (keyof FormState)[] = [
  'vial_size_mg', 'price_usd', 'subscription_price_usd', 'shipping_cost_usd',
  'free_shipping_threshold_usd', 'telehealth_cost_usd',
];

function formToPayload(f: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: f.name.trim(),
    website_url: f.website_url.trim() || null,
    source_type: f.source_type || null,
    subscription_interval: f.subscription_interval.trim() || null,
    telehealth_required: f.telehealth_required,
    labs_required: f.labs_required,
    status: f.status,
    notes: f.notes.trim() || null,
  };
  for (const key of NUMERIC_KEYS) {
    const raw = f[key] as string;
    payload[key] = raw.trim() === '' ? null : Number(raw);
  }
  return payload;
}

export default function TirzepatideTracker() {
  const [compounders, setCompounders] = useState<Compounder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/tirzepatide`, { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setCompounders(data.compounders ?? []);
      } catch {
        setError('Could not load the compounder list — check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    const withCost = compounders.map(c => ({ c, cost: getEffectiveCostPerMg(c) }));
    withCost.sort((a, b) => {
      if (a.cost === null && b.cost === null) return 0;
      if (a.cost === null) return 1;
      if (b.cost === null) return -1;
      return sortAsc ? a.cost - b.cost : b.cost - a.cost;
    });
    return withCost;
  }, [compounders, sortAsc]);

  function flash(msg: string) {
    setConfirmMsg(msg);
    setTimeout(() => setConfirmMsg(null), 3000);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(c: Compounder) {
    setEditingId(c.id);
    setForm(toFormState(c));
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.name.trim()) {
      flash('Please enter a name.');
      return;
    }
    const payload = formToPayload(form);
    try {
      if (editingId === null) {
        const res = await fetch(`${API}/api/client/tirzepatide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('save failed');
        const created = await res.json();
        setCompounders(prev => [...prev, created]);
        flash(`Added "${form.name.trim()}".`);
      } else {
        const res = await fetch(`${API}/api/client/tirzepatide/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('save failed');
        const updated = await res.json();
        setCompounders(prev => prev.map(c => (c.id === editingId ? updated : c)));
        flash(`Updated "${form.name.trim()}".`);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      flash('Failed to save — check your connection.');
    }
  }

  async function deleteCompounder(c: Compounder) {
    if (!confirm(`Remove "${c.name}" from your tracker?`)) return;
    try {
      const res = await fetch(`${API}/api/client/tirzepatide/${c.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('delete failed');
      setCompounders(prev => prev.filter(x => x.id !== c.id));
      flash(`Removed "${c.name}".`);
    } catch {
      flash('Failed to delete — check your connection.');
    }
  }

  const inputStyle: React.CSSProperties = {
    borderColor: 'rgba(var(--copper-bold-rgb),0.3)',
    color: 'var(--copper-tan)',
    background: 'transparent',
  };

  if (loading) {
    return <div className="py-12 text-center" style={{ color: 'var(--copper-tan)' }}>Loading…</div>;
  }

  return (
    <div style={{ color: 'var(--copper-tan)' }}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--copper-tan)', textShadow: '0 0 16px rgba(var(--copper-bold-rgb),0.3)' }}>
            Tirzepatide Compounder Tracker
          </h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }}>
            Compare pricing across compounding pharmacies to find the most affordable option
          </p>
          {error && <p className="text-xs mt-1 text-red-400">{error}</p>}
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold flex-shrink-0"
          style={{ background: 'var(--copper-bold)', color: 'var(--stone-0)' }}
        >
          <Plus size={14} /> Add Compounder
        </button>
      </div>

      {compounders.length === 0 && !showForm && (
        <div className="text-center py-10 text-sm" style={{ color: 'rgba(var(--copper-tan-rgb),0.55)' }}>
          No compounders added yet. Click &quot;Add Compounder&quot; to start tracking one.
        </div>
      )}

      {compounders.length > 0 && (
        <div className="overflow-x-auto rounded-md" style={{ background: 'rgba(20,18,16,0.6)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(var(--copper-bold-rgb),0.2)' }}>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Source</th>
                <th className="text-left px-3 py-2">Vial</th>
                <th className="text-left px-3 py-2">Price</th>
                <th className="text-left px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSortAsc(prev => !prev)}
                    className="flex items-center gap-1 font-semibold"
                    style={{ color: 'var(--copper-tan)' }}
                  >
                    $/mg <ArrowUpDown size={11} />
                  </button>
                </th>
                <th className="text-left px-3 py-2">Subscription</th>
                <th className="text-left px-3 py-2">Shipping</th>
                <th className="text-left px-3 py-2">Telehealth/Labs</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Notes</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ c, cost }) => {
                const status = STATUS_STYLE[c.status];
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(var(--copper-bold-rgb),0.1)' }}>
                    <td className="px-3 py-2 font-semibold">
                      <div className="flex items-center gap-1.5">
                        {c.name}
                        {c.website_url && (
                          <a href={c.website_url} target="_blank" rel="noopener noreferrer" title={c.website_url}>
                            <ExternalLink size={11} style={{ color: 'rgba(var(--copper-tan-rgb),0.6)' }} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {c.source_type ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                          style={{ background: SOURCE_TYPE_STYLE[c.source_type].bg, color: SOURCE_TYPE_STYLE[c.source_type].color }}
                        >
                          {SOURCE_TYPE_STYLE[c.source_type].label}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(var(--copper-tan-rgb),0.4)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{toNum(c.vial_size_mg) !== null ? `${toNum(c.vial_size_mg)} mg` : '—'}</td>
                    <td className="px-3 py-2">{money(c.price_usd)}</td>
                    <td className="px-3 py-2 font-semibold" style={{ color: cost !== null ? '#4caf50' : undefined }}>
                      {cost !== null ? `$${cost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {c.subscription_price_usd
                        ? `${money(c.subscription_price_usd)}/${c.subscription_interval || 'period'}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {toNum(c.shipping_cost_usd) === 0 ? 'Free' : money(c.shipping_cost_usd)}
                      {c.free_shipping_threshold_usd ? ` (free ≥ ${money(c.free_shipping_threshold_usd)})` : ''}
                    </td>
                    <td className="px-3 py-2">
                      {c.telehealth_required ? `Telehealth ${money(c.telehealth_cost_usd)}` : 'No telehealth'}
                      {c.labs_required ? ' + labs' : ''}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate" title={c.notes ?? ''} style={{ color: 'rgba(var(--copper-tan-rgb),0.75)' }}>
                      {c.notes || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => startEdit(c)} title="Edit">
                          <Pencil size={13} style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }} />
                        </button>
                        <button type="button" onClick={() => deleteCompounder(c)} title="Delete">
                          <Trash2 size={13} style={{ color: '#c85050' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="rounded-md p-4 mt-4 space-y-3" style={{ background: 'rgba(20,18,16,0.6)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--copper-tan)' }}>
            {editingId === null ? 'Add a Compounder' : 'Edit Compounder'}
          </h3>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Pharmacy Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Website URL</label>
            <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://..." className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Source Type</label>
              <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value as typeof f.source_type }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                <option value="" style={{ color: '#000' }}>Not specified</option>
                <option value="compounded" style={{ color: '#000' }}>Compounded (503A/503B pharmacy)</option>
                <option value="manufacturer_direct" style={{ color: '#000' }}>Manufacturer-direct (brand Rx)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Vial Size (mg)</label>
              <input value={form.vial_size_mg} onChange={e => setForm(f => ({ ...f, vial_size_mg: e.target.value }))} placeholder="e.g. 10" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Price per Vial ($)</label>
              <input value={form.price_usd} onChange={e => setForm(f => ({ ...f, price_usd: e.target.value }))} placeholder="e.g. 200" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                <option value="researching" style={{ color: '#000' }}>Researching</option>
                <option value="contacted" style={{ color: '#000' }}>Contacted</option>
                <option value="ordered" style={{ color: '#000' }}>Ordered</option>
                <option value="rejected" style={{ color: '#000' }}>Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Subscription Price ($)</label>
              <input value={form.subscription_price_usd} onChange={e => setForm(f => ({ ...f, subscription_price_usd: e.target.value }))} placeholder="leave blank if one-time only" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Subscription Interval</label>
              <input value={form.subscription_interval} onChange={e => setForm(f => ({ ...f, subscription_interval: e.target.value }))} placeholder="e.g. monthly" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Shipping Cost ($)</label>
              <input value={form.shipping_cost_usd} onChange={e => setForm(f => ({ ...f, shipping_cost_usd: e.target.value }))} placeholder="0 = free" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Free Shipping Threshold ($)</label>
              <input value={form.free_shipping_threshold_usd} onChange={e => setForm(f => ({ ...f, free_shipping_threshold_usd: e.target.value }))} placeholder="optional" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="telehealth" checked={form.telehealth_required} onChange={e => setForm(f => ({ ...f, telehealth_required: e.target.checked }))} />
              <label htmlFor="telehealth" className="text-xs" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Telehealth visit required</label>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Telehealth Cost ($)</label>
              <input value={form.telehealth_cost_usd} onChange={e => setForm(f => ({ ...f, telehealth_cost_usd: e.target.value }))} placeholder="optional" inputMode="decimal" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="labs" checked={form.labs_required} onChange={e => setForm(f => ({ ...f, labs_required: e.target.checked }))} />
            <label htmlFor="labs" className="text-xs" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Bloodwork/labs required</label>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'rgba(var(--copper-tan-rgb),0.7)' }}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Reviews, red flags, how you found them, anything else worth remembering..." className="w-full border px-2 py-1.5 text-sm rounded resize-vertical" style={inputStyle} />
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={saveForm} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: 'var(--copper-bold)', color: 'var(--stone-0)' }}>
              {editingId === null ? 'Add Compounder' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-4 py-2 rounded-md text-sm font-semibold border"
              style={{ borderColor: 'rgba(var(--copper-bold-rgb),0.3)', color: 'var(--copper-tan)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmMsg && (
        <div className="mt-3 text-xs rounded-md p-2" style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50' }}>
          {confirmMsg}
        </div>
      )}
    </div>
  );
}
