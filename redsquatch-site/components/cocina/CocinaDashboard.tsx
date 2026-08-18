'use client';

import { useMemo } from 'react';
import { Star, Flame, Clock, Package, ShoppingBag } from 'lucide-react';
import type { CocinaView, PantryItem, Salsa } from './types';

interface Props {
  pantryItems: PantryItem[];
  salsas: Salsa[];
  onOpenRecipe: (salsaId: number) => void;
  onNavigate: (view: CocinaView) => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function CocinaDashboard({ pantryItems, salsas, onOpenRecipe, onNavigate }: Props) {
  const recentPantry = useMemo(() => pantryItems.slice(0, 5), [pantryItems]);
  const topMatches = useMemo(
    () => [...salsas].sort((a, b) => b.pantry_match_pct - a.pantry_match_pct).slice(0, 3),
    [salsas]
  );

  return (
    <div className="space-y-6">
      <div className="cocina-card p-6">
        <h2 className="text-2xl mb-1">{greeting()}</h2>
        <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>
          {pantryItems.length === 0
            ? 'Your pantry is empty — add a few ingredients and that\'s where the sabor lives.'
            : `Your pantry has ${pantryItems.length} item${pantryItems.length === 1 ? '' : 's'} — a little magic waiting on the shelf.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={() => onNavigate('pantry')} className="cocina-card p-4 text-left cocina-tile">
          <Package size={20} style={{ color: 'var(--cocina-terracotta)' }} />
          <div className="mt-2 font-semibold" style={{ color: 'var(--cocina-heading)' }}>Add from kitchen</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cocina-text-soft)' }}>Manage pantry</div>
        </button>
        <button onClick={() => onNavigate('salsas')} className="cocina-card p-4 text-left cocina-tile">
          <Star size={20} style={{ color: 'var(--cocina-ochre)' }} />
          <div className="mt-2 font-semibold" style={{ color: 'var(--cocina-heading)' }}>Saved salsas</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cocina-text-soft)' }}>{salsas.length} recipe{salsas.length === 1 ? '' : 's'}</div>
        </button>
        <button onClick={() => onNavigate('shopping')} className="cocina-card p-4 text-left cocina-tile">
          <ShoppingBag size={20} style={{ color: 'var(--cocina-sage)' }} />
          <div className="mt-2 font-semibold" style={{ color: 'var(--cocina-heading)' }}>Next trip</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--cocina-text-soft)' }}>Shopping list</div>
        </button>
      </div>

      <div>
        <h3 className="text-lg mb-3">Recently added</h3>
        {recentPantry.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>Nothing in the pantry yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentPantry.map(item => (
              <div key={item.id} className="cocina-card px-4 py-2 flex items-center justify-between">
                <span className="font-medium" style={{ color: 'var(--cocina-heading-soft)' }}>{item.name}</span>
                <span className="cocina-pill">{item.storage_condition}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg mb-3">Recipes ready for your pantry</h3>
        {topMatches.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>
            No saved salsas yet — save one and see how close it is to ready.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topMatches.map(salsa => (
              <button key={salsa.id} onClick={() => onOpenRecipe(salsa.id)} className="cocina-card p-4 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold" style={{ color: 'var(--cocina-heading)' }}>{salsa.title}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--cocina-ochre-strong)' }}>
                    {salsa.pantry_match_pct}%
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--cocina-text-soft)' }}>
                  <span className={`flex items-center gap-1 cocina-heat-${salsa.heat_level}`}>
                    <Flame size={12} /> {salsa.heat_level}
                  </span>
                  {salsa.prep_minutes != null && (
                    <span className="flex items-center gap-1"><Clock size={12} /> {salsa.prep_minutes}m</span>
                  )}
                  {salsa.rating != null && (
                    <span className="flex items-center gap-1"><Star size={12} /> {salsa.rating}/5</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
