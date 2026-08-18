'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Star, Flame, Clock, Check, ShoppingBag } from 'lucide-react';
import { API } from '@/lib/api';
import type { SalsaDetail } from './types';

interface Props {
  salsaId: number;
  onBack: () => void;
  onSalsaChanged: () => void;
  onShoppingChanged: () => void;
}

export default function CocinaRecipeDetail({ salsaId, onBack, onSalsaChanged, onShoppingChanged }: Props) {
  const [salsa, setSalsa] = useState<SalsaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMissing, setAddingMissing] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/cocina/salsas/${salsaId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('fetch failed');
      setSalsa(await res.json());
    } catch {
      setError('Could not load this salsa — check your connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salsaId]);

  async function setRating(rating: number) {
    if (!salsa) return;
    setSalsa({ ...salsa, rating });
    try {
      const res = await fetch(`${API}/api/client/cocina/salsas/${salsaId}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error('rate failed');
      onSalsaChanged();
    } catch {
      setError('Could not save that rating — check your connection.');
    }
  }

  async function addMissingToShopping() {
    setAddingMissing(true);
    try {
      const res = await fetch(`${API}/api/client/cocina/shopping/from-salsa/${salsaId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('add failed');
      const data = await res.json();
      onShoppingChanged();
      setConfirmMsg(`Added ${data.added?.length ?? 0} item${data.added?.length === 1 ? '' : 's'} to your shopping list.`);
      setTimeout(() => setConfirmMsg(null), 3000);
    } catch {
      setError('Could not add missing ingredients — check your connection.');
    } finally {
      setAddingMissing(false);
    }
  }

  if (loading) return <div className="cocina-card p-6 text-sm">Loading…</div>;
  if (error || !salsa) return <div className="cocina-card p-6 text-sm" style={{ color: 'var(--cocina-terracotta-strong)' }}>{error ?? 'Not found.'}</div>;

  const missingCount = salsa.ingredients.filter(i => !i.in_pantry).length;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm cocina-btn-secondary px-3 py-1.5 w-fit">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="cocina-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl">{salsa.title}</h2>
            {salsa.description && <p className="text-sm mt-1" style={{ color: 'var(--cocina-text-soft)' }}>{salsa.description}</p>}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)}>
                <Star
                  size={20}
                  fill={salsa.rating != null && n <= salsa.rating ? 'var(--cocina-ochre)' : 'none'}
                  style={{ color: 'var(--cocina-ochre)' }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm mt-4" style={{ color: 'var(--cocina-text-soft)' }}>
          <span className={`flex items-center gap-1 cocina-heat-${salsa.heat_level}`}>
            <Flame size={14} /> {salsa.heat_level}
          </span>
          {salsa.prep_minutes != null && (
            <span className="flex items-center gap-1"><Clock size={14} /> {salsa.prep_minutes} min</span>
          )}
          <span className="font-semibold" style={{ color: 'var(--cocina-ochre-strong)' }}>
            {salsa.pantry_match_pct}% pantry ready
          </span>
        </div>

        {salsa.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {salsa.tags.map(tag => <span key={tag} className="cocina-pill">{tag}</span>)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="cocina-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg">Ingredients</h3>
            {missingCount > 0 && (
              <button
                onClick={addMissingToShopping}
                disabled={addingMissing}
                className="cocina-btn-primary px-3 py-1 text-xs flex items-center gap-1 disabled:opacity-50"
              >
                <ShoppingBag size={12} /> Add {missingCount} missing
              </button>
            )}
          </div>
          {confirmMsg && <p className="text-xs mb-2" style={{ color: 'var(--cocina-sage-strong)' }}>{confirmMsg}</p>}
          <ul className="space-y-2">
            {salsa.ingredients.map(ing => (
              <li key={ing.id} className="flex items-center justify-between text-sm">
                <span style={{ color: ing.in_pantry ? 'var(--cocina-heading-soft)' : 'var(--cocina-text-soft)' }}>
                  {ing.name}{ing.quantity ? ` — ${ing.quantity}` : ''}
                </span>
                {ing.in_pantry ? (
                  <Check size={14} style={{ color: 'var(--cocina-sage-strong)' }} />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--cocina-terracotta-soft)' }}>missing</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="cocina-card p-5">
          <h3 className="text-lg mb-3">Steps</h3>
          <ol className="space-y-3">
            {salsa.steps.map(step => (
              <li key={step.id} className="text-sm flex gap-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--cocina-surface-strong)', color: 'var(--cocina-heading)' }}
                >
                  {step.step_number}
                </span>
                <span style={{ color: 'var(--cocina-heading-soft)' }}>
                  {step.instruction}
                  {step.minutes != null && (
                    <span className="text-xs ml-2" style={{ color: 'var(--cocina-text-soft)' }}>({step.minutes}m)</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
