'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy, Check as CheckIcon, MapPin } from 'lucide-react';
import { API } from '@/lib/api';
import type { ShoppingItem } from './types';

interface Props {
  shoppingItems: ShoppingItem[];
  onChanged: () => void;
}

// Static placeholder — no live store-locator API is wired up (scoped out for v1).
const NEARBY_STORES = [
  { name: 'Mercado Central', hours: 'Open · 7am–10pm' },
  { name: 'Fresh Fields Market', hours: 'Open · 8am–9pm' },
];

export default function CocinaShopping({ shoppingItems, onChanged }: Props) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function addItem() {
    if (!name.trim()) return;
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), quantity: quantity.trim() || null }),
      });
      if (!res.ok) throw new Error('save failed');
      setName('');
      setQuantity('');
      await onChanged();
    } catch {
      setError('Could not add that item — check your connection.');
    }
  }

  async function toggleChecked(item: ShoppingItem) {
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (!res.ok) throw new Error('update failed');
      await onChanged();
    } catch {
      setError('Could not update that item — check your connection.');
    }
  }

  async function deleteItem(id: number) {
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('delete failed');
      await onChanged();
    } catch {
      setError('Could not remove that item — check your connection.');
    }
  }

  async function finalizeTrip() {
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping/finalize`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('finalize failed');
      await onChanged();
    } catch {
      setError('Could not finalize the trip — check your connection.');
    }
  }

  async function clearList() {
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping/clear`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('clear failed');
      await onChanged();
    } catch {
      setError('Could not clear the list — check your connection.');
    }
  }

  async function copyList() {
    const text = shoppingItems.map(i => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the list to your clipboard.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="cocina-card p-5">
        <h2 className="text-xl mb-1">Your next trip</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--cocina-text-soft)' }}>Market basket for the week ahead.</p>

        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Add another ingredient"
            className="cocina-card flex-1 px-3 py-2 text-sm min-w-[180px]"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <input
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="Qty"
            className="cocina-card w-24 px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <button onClick={addItem} className="cocina-btn-primary px-4 py-2 text-sm flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>

        {error && <p className="text-sm mt-3" style={{ color: 'var(--cocina-terracotta-strong)' }}>{error}</p>}
      </div>

      <div>
        {shoppingItems.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>Your list is empty.</p>
        ) : (
          <div className="space-y-2">
            {shoppingItems.map(item => (
              <div key={item.id} className="cocina-card px-4 py-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input type="checkbox" checked={item.checked} onChange={() => toggleChecked(item)} />
                  <div>
                    <div
                      className="font-medium"
                      style={{
                        color: item.checked ? 'var(--cocina-text-soft)' : 'var(--cocina-heading-soft)',
                        textDecoration: item.checked ? 'line-through' : 'none',
                      }}
                    >
                      {item.name}{item.quantity ? ` — ${item.quantity}` : ''}
                    </div>
                    {item.source && (
                      <div className="text-xs" style={{ color: 'var(--cocina-text-soft)' }}>from {item.source}</div>
                    )}
                  </div>
                </label>
                <button onClick={() => deleteItem(item.id)} style={{ color: 'var(--cocina-terracotta-strong)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={finalizeTrip} className="cocina-btn-primary px-4 py-2 text-sm">Finalize shopping trip</button>
        <button onClick={clearList} className="cocina-btn-secondary px-4 py-2 text-sm">Clear list</button>
        <button onClick={copyList} className="cocina-btn-secondary px-4 py-2 text-sm flex items-center gap-1">
          {copied ? <CheckIcon size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy list'}
        </button>
      </div>

      <div>
        <h3 className="text-lg mb-3 flex items-center gap-2"><MapPin size={16} /> Nearby</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NEARBY_STORES.map(store => (
            <div key={store.name} className="cocina-card px-4 py-3">
              <div className="font-medium" style={{ color: 'var(--cocina-heading-soft)' }}>{store.name}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--cocina-sage-strong)' }}>{store.hours}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
