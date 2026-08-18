'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { API } from '@/lib/api';
import type { PantryItem, StorageCondition } from './types';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setName('');
      setQuantity('');
      setUnit('');
      setCategory('');
      setStorage('fresh');
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

  return (
    <div className="space-y-6">
      <div className="cocina-card p-5">
        <h2 className="text-xl mb-1">Add something good</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--cocina-text-soft)' }}>Fast entry — name, amount, and where it lives.</p>

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
    </div>
  );
}
