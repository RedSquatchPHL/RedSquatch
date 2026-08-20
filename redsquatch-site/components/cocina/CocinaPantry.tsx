'use client';

import { useState } from 'react';
import { Plus, Trash2, ScanLine } from 'lucide-react';
import { API } from '@/lib/api';
import type { PantryItem, StorageCondition } from './types';
import CocinaScanner, { ScanOutcome } from './CocinaScanner';

interface Props {
  pantryItems: PantryItem[];
  onChanged: () => void;
  onSalsasNeedRefresh: () => void;
}

const STORAGE_OPTIONS: StorageCondition[] = ['fresh', 'dried', 'jarred', 'frozen'];

export default function CocinaPantry({ pantryItems, onChanged, onSalsasNeedRefresh }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [storage, setStorage] = useState<StorageCondition>('fresh');
  const [barcode, setBarcode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [matchedItem, setMatchedItem] = useState<PantryItem | null>(null);

  function resetForm() {
    setName('');
    setQuantity('');
    setUnit('');
    setCategory('');
    setStorage('fresh');
    setBarcode(null);
  }

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/cocina/pantry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantity.trim() || null,
          unit: unit.trim() || null,
          category: category.trim() || null,
          storage_condition: storage,
          barcode,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      resetForm();
      setScanNotice(null);
      await onChanged();
      onSalsasNeedRefresh();
    } catch {
      setError('Could not add that item — check your connection.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: number) {
    try {
      const res = await fetch(`${API}/api/client/cocina/pantry/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('delete failed');
      await onChanged();
      onSalsasNeedRefresh();
    } catch {
      setError('Could not remove that item — check your connection.');
    }
  }

  function handleScanOutcome(outcome: ScanOutcome) {
    setScannerOpen(false);
    const code = outcome.status === 'found' ? outcome.result.barcode : outcome.barcode;

    const existing = pantryItems.find(item => item.barcode === code);
    if (existing) {
      setMatchedItem(existing);
      setScanNotice(null);
      return;
    }

    setMatchedItem(null);
    setBarcode(code);
    if (outcome.status === 'found') {
      setName(outcome.result.name);
      setCategory(outcome.result.category ?? '');
      setScanNotice(null);
    } else {
      setName('');
      setCategory('');
      setScanNotice("No product match for that barcode — this is common for fresh produce. Fill in the details below.");
    }
  }

  async function bumpMatchedQuantity() {
    if (!matchedItem) return;
    const current = Number(matchedItem.quantity);
    if (!Number.isFinite(current)) return;
    try {
      const res = await fetch(`${API}/api/client/cocina/pantry/${matchedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity: String(current + 1) }),
      });
      if (!res.ok) throw new Error('update failed');
      setMatchedItem(null);
      await onChanged();
    } catch {
      setError('Could not update that item — check your connection.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="cocina-card p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl">Add something good</h2>
          <button
            onClick={() => { setScanNotice(null); setMatchedItem(null); setScannerOpen(true); }}
            className="cocina-btn-secondary px-3 py-1.5 flex items-center gap-1.5 text-sm flex-shrink-0"
          >
            <ScanLine size={15} /> Scan
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--cocina-text-soft)' }}>Fast entry — name, amount, and where it lives. Or scan a package barcode.</p>

        {matchedItem && (
          <div className="cocina-card px-4 py-3 mb-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--cocina-ochre-strong)' }}>
            <div className="text-sm" style={{ color: 'var(--cocina-heading-soft)' }}>
              Already in your pantry: <strong>{matchedItem.name}</strong>
              {matchedItem.quantity ? ` — ${[matchedItem.quantity, matchedItem.unit].filter(Boolean).join(' ')}` : ''}
            </div>
            {Number.isFinite(Number(matchedItem.quantity)) ? (
              <button onClick={bumpMatchedQuantity} className="cocina-btn-primary px-3 py-1 text-sm flex-shrink-0">+1</button>
            ) : (
              <button onClick={() => setMatchedItem(null)} className="cocina-btn-secondary px-3 py-1 text-sm flex-shrink-0">Dismiss</button>
            )}
          </div>
        )}

        {scanNotice && (
          <p className="text-sm mb-4" style={{ color: 'var(--cocina-terracotta-soft)' }}>{scanNotice}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ingredient (e.g. Serrano, Limes, White onion)"
            className="cocina-card px-3 py-2 text-sm sm:col-span-2"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="cocina-card px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <input
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="Unit (pieces, jars, bunches, kg)"
            className="cocina-card px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="cocina-card px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <div className="flex flex-wrap gap-2 items-center">
            {STORAGE_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setStorage(opt)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  storage === opt ? 'cocina-btn-primary' : 'cocina-btn-secondary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm mt-3" style={{ color: 'var(--cocina-terracotta-strong)' }}>{error}</p>}

        <button
          onClick={addItem}
          disabled={saving || !name.trim()}
          className="cocina-btn-primary px-5 py-2 mt-4 flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Plus size={16} /> Add to pantry
        </button>
      </div>

      <div>
        <h3 className="text-lg mb-3">Your pantry ({pantryItems.length})</h3>
        {pantryItems.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>Nothing here yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pantryItems.map(item => (
              <div key={item.id} className="cocina-card px-4 py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium" style={{ color: 'var(--cocina-heading-soft)' }}>{item.name}</div>
                  <div className="text-xs" style={{ color: 'var(--cocina-text-soft)' }}>
                    {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    {item.category ? ` · ${item.category}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.barcode && <ScanLine size={13} style={{ color: 'var(--cocina-text-soft)' }} aria-label="Linked to a scanned barcode" />}
                  <span className="cocina-pill">{item.storage_condition}</span>
                  <button onClick={() => deleteItem(item.id)} title="Remove" style={{ color: 'var(--cocina-terracotta-strong)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {scannerOpen && (
        <CocinaScanner onDetected={handleScanOutcome} onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
}
