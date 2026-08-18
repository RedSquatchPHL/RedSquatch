'use client';

import { useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { fontCocinaDisplay, fontCocinaSans } from '@/lib/fonts';
import '@/styles/cocina-theme.css';
import type { CocinaView, PantryItem, Salsa, ShoppingItem } from './types';
import CocinaDashboard from './CocinaDashboard';
import CocinaPantry from './CocinaPantry';
import CocinaSalsas from './CocinaSalsas';
import CocinaRecipeDetail from './CocinaRecipeDetail';
import CocinaShopping from './CocinaShopping';

export default function CocinaApp() {
  const [view, setView] = useState<CocinaView>('dashboard');
  const [selectedSalsaId, setSelectedSalsaId] = useState<number | null>(null);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [salsas, setSalsas] = useState<Salsa[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPantry = useCallback(async () => {
    const res = await fetch(`${API}/api/client/cocina/pantry`, { credentials: 'include' });
    if (!res.ok) throw new Error('pantry fetch failed');
    const data = await res.json();
    setPantryItems(data.items ?? []);
  }, []);

  const refreshSalsas = useCallback(async () => {
    const res = await fetch(`${API}/api/client/cocina/salsas`, { credentials: 'include' });
    if (!res.ok) throw new Error('salsas fetch failed');
    const data = await res.json();
    setSalsas(data.salsas ?? []);
  }, []);

  const refreshShopping = useCallback(async () => {
    const res = await fetch(`${API}/api/client/cocina/shopping`, { credentials: 'include' });
    if (!res.ok) throw new Error('shopping fetch failed');
    const data = await res.json();
    setShoppingItems(data.items ?? []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshPantry(), refreshSalsas(), refreshShopping()]);
  }, [refreshPantry, refreshSalsas, refreshShopping]);

  useEffect(() => {
    (async () => {
      try {
        await refreshAll();
      } catch {
        setError('Could not load Cocina — check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshAll]);

  function openRecipe(salsaId: number) {
    setSelectedSalsaId(salsaId);
    setView('recipe');
  }

  const rootClass = `cocina-root ${fontCocinaDisplay.variable} ${fontCocinaSans.variable} min-h-screen p-4 md:p-8`;

  if (loading) {
    return <div className={rootClass} />;
  }

  return (
    <div className={rootClass}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-2">
          <h1 className="text-3xl font-semibold">Cocina de Salsa</h1>
          <nav className="flex flex-wrap gap-2">
            {([
              ['dashboard', 'Dashboard'],
              ['pantry', 'Pantry'],
              ['salsas', 'Saved Salsas'],
              ['shopping', 'Shopping'],
            ] as [CocinaView, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  view === key ? 'cocina-btn-primary' : 'cocina-btn-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {error && (
          <div className="cocina-card p-3 text-sm" style={{ color: 'var(--cocina-terracotta-strong)' }}>
            {error}
          </div>
        )}

        {view === 'dashboard' && (
          <CocinaDashboard
            pantryItems={pantryItems}
            salsas={salsas}
            onOpenRecipe={openRecipe}
            onNavigate={setView}
          />
        )}

        {view === 'pantry' && (
          <CocinaPantry pantryItems={pantryItems} onChanged={refreshPantry} onSalsasNeedRefresh={refreshSalsas} />
        )}

        {view === 'salsas' && (
          <CocinaSalsas salsas={salsas} onChanged={refreshSalsas} onOpenRecipe={openRecipe} />
        )}

        {view === 'recipe' && selectedSalsaId !== null && (
          <CocinaRecipeDetail
            salsaId={selectedSalsaId}
            onBack={() => setView('salsas')}
            onSalsaChanged={refreshSalsas}
            onShoppingChanged={refreshShopping}
          />
        )}

        {view === 'shopping' && (
          <CocinaShopping shoppingItems={shoppingItems} onChanged={refreshShopping} />
        )}
      </div>
    </div>
  );
}
