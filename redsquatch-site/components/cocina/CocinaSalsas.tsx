'use client';

import { useMemo, useState } from 'react';
import { Star, Flame, Clock, Plus, Trash2, X, Link2 } from 'lucide-react';
import { API } from '@/lib/api';
import type { HeatLevel, Salsa } from './types';

interface Props {
  salsas: Salsa[];
  onChanged: () => void;
  onOpenRecipe: (salsaId: number) => void;
}

type HeatFilter = HeatLevel | 'all';

interface DraftIngredient { name: string; quantity: string }
interface DraftStep { instruction: string; minutes: string }

const EMPTY_INGREDIENT: DraftIngredient = { name: '', quantity: '' };
const EMPTY_STEP: DraftStep = { instruction: '', minutes: '' };

export default function CocinaSalsas({ salsas, onChanged, onOpenRecipe }: Props) {
  const [heatFilter, setHeatFilter] = useState<HeatFilter>('all');
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [heatLevel, setHeatLevel] = useState<HeatLevel>('medium');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([{ ...EMPTY_INGREDIENT }]);
  const [steps, setSteps] = useState<DraftStep[]>([{ ...EMPTY_STEP }]);

  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return salsas.filter(s => {
      if (heatFilter !== 'all' && s.heat_level !== heatFilter) return false;
      if (maxMinutes != null && (s.prep_minutes == null || s.prep_minutes > maxMinutes)) return false;
      return true;
    });
  }, [salsas, heatFilter, maxMinutes]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setHeatLevel('medium');
    setPrepMinutes('');
    setTagsInput('');
    setImageUrl(null);
    setIngredients([{ ...EMPTY_INGREDIENT }]);
    setSteps([{ ...EMPTY_STEP }]);
    setShowForm(false);
  }

  async function importFromUrl() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`${API}/api/client/cocina/salsas/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'import failed');

      setTitle(data.title || '');
      setDescription(data.description || '');
      setHeatLevel((['mild', 'medium', 'hot'] as HeatLevel[]).includes(data.heat_level) ? data.heat_level : 'medium');
      setPrepMinutes(data.prep_minutes != null ? String(data.prep_minutes) : '');
      setTagsInput(Array.isArray(data.tags) ? data.tags.join(', ') : '');
      setImageUrl(data.image_url || null);
      setIngredients(
        Array.isArray(data.ingredients) && data.ingredients.length > 0
          ? data.ingredients.map((i: { name: string; quantity: string | null }) => ({ name: i.name, quantity: i.quantity || '' }))
          : [{ ...EMPTY_INGREDIENT }]
      );
      setSteps(
        Array.isArray(data.steps) && data.steps.length > 0
          ? data.steps.map((s: { instruction: string; minutes: number | null }) => ({ instruction: s.instruction, minutes: s.minutes != null ? String(s.minutes) : '' }))
          : [{ ...EMPTY_STEP }]
      );

      setShowImport(false);
      setImportUrl('');
      setShowForm(true);
    } catch (err) {
      setImportError(err instanceof Error && err.message !== 'import failed' ? err.message : 'Could not import from that URL.');
    } finally {
      setImporting(false);
    }
  }

  async function saveSalsa() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/cocina/salsas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          heat_level: heatLevel,
          prep_minutes: prepMinutes ? Number(prepMinutes) : null,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          image_url: imageUrl || null,
          ingredients: ingredients.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), quantity: i.quantity.trim() || null })),
          steps: steps.filter(s => s.instruction.trim()).map(s => ({ instruction: s.instruction.trim(), minutes: s.minutes ? Number(s.minutes) : null })),
        }),
      });
      if (!res.ok) throw new Error('save failed');
      resetForm();
      await onChanged();
    } catch {
      setError('Could not save that salsa — check your connection.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSalsa(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/client/cocina/salsas/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('delete failed');
      await onChanged();
    } catch {
      setError('Could not delete that salsa — check your connection.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'mild', 'medium', 'hot'] as HeatFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setHeatFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${heatFilter === f ? 'cocina-btn-primary' : 'cocina-btn-secondary'}`}
            >
              {f === 'all' ? 'All recipes' : f}
            </button>
          ))}
          <button
            onClick={() => setMaxMinutes(maxMinutes === 20 ? null : 20)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${maxMinutes === 20 ? 'cocina-btn-primary' : 'cocina-btn-secondary'}`}
          >
            Under 20 min
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(s => !s)} className="cocina-btn-secondary px-4 py-1.5 flex items-center gap-2 text-sm">
            <Link2 size={14} /> Import from URL
          </button>
          <button onClick={() => setShowForm(s => !s)} className="cocina-btn-primary px-4 py-1.5 flex items-center gap-2 text-sm">
            <Plus size={14} /> New salsa
          </button>
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: 'var(--cocina-terracotta-strong)' }}>{error}</p>}

      {showImport && (
        <div className="cocina-card p-4 flex flex-wrap gap-2 items-start">
          <input
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') importFromUrl(); }}
            placeholder="Paste a recipe URL"
            className="cocina-card flex-1 px-3 py-2 text-sm min-w-[220px]"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <button
            onClick={importFromUrl}
            disabled={importing || !importUrl.trim()}
            className="cocina-btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Fetch recipe'}
          </button>
          {importError && (
            <p className="text-sm w-full" style={{ color: 'var(--cocina-terracotta-strong)' }}>{importError}</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="cocina-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg">New salsa</h3>
            <button onClick={resetForm}><X size={18} /></button>
          </div>

          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-xl" />
          )}

          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="cocina-card w-full px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="cocina-card w-full px-3 py-2 text-sm"
            style={{ color: 'var(--cocina-heading-soft)' }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex gap-2">
              {(['mild', 'medium', 'hot'] as HeatLevel[]).map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHeatLevel(h)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${heatLevel === h ? 'cocina-btn-primary' : 'cocina-btn-secondary'}`}
                >
                  {h}
                </button>
              ))}
            </div>
            <input
              value={prepMinutes}
              onChange={e => setPrepMinutes(e.target.value)}
              placeholder="Prep minutes"
              type="number"
              className="cocina-card px-3 py-2 text-sm"
              style={{ color: 'var(--cocina-heading-soft)' }}
            />
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="Tags, comma separated"
              className="cocina-card px-3 py-2 text-sm"
              style={{ color: 'var(--cocina-heading-soft)' }}
            />
          </div>

          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--cocina-heading)' }}>Ingredients</div>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={ing.name}
                  onChange={e => setIngredients(prev => prev.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row))}
                  placeholder="Ingredient"
                  className="cocina-card flex-1 px-3 py-1.5 text-sm"
                  style={{ color: 'var(--cocina-heading-soft)' }}
                />
                <input
                  value={ing.quantity}
                  onChange={e => setIngredients(prev => prev.map((row, idx) => idx === i ? { ...row, quantity: e.target.value } : row))}
                  placeholder="Qty"
                  className="cocina-card w-28 px-3 py-1.5 text-sm"
                  style={{ color: 'var(--cocina-heading-soft)' }}
                />
                <button onClick={() => setIngredients(prev => prev.filter((_, idx) => idx !== i))} style={{ color: 'var(--cocina-terracotta-strong)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={() => setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }])} className="cocina-btn-secondary px-3 py-1 text-xs">
              + Add ingredient
            </button>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--cocina-heading)' }}>Steps</div>
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={step.instruction}
                  onChange={e => setSteps(prev => prev.map((row, idx) => idx === i ? { ...row, instruction: e.target.value } : row))}
                  placeholder={`Step ${i + 1}`}
                  className="cocina-card flex-1 px-3 py-1.5 text-sm"
                  style={{ color: 'var(--cocina-heading-soft)' }}
                />
                <input
                  value={step.minutes}
                  onChange={e => setSteps(prev => prev.map((row, idx) => idx === i ? { ...row, minutes: e.target.value } : row))}
                  placeholder="Min"
                  type="number"
                  className="cocina-card w-20 px-3 py-1.5 text-sm"
                  style={{ color: 'var(--cocina-heading-soft)' }}
                />
                <button onClick={() => setSteps(prev => prev.filter((_, idx) => idx !== i))} style={{ color: 'var(--cocina-terracotta-strong)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button onClick={() => setSteps(prev => [...prev, { ...EMPTY_STEP }])} className="cocina-btn-secondary px-3 py-1 text-xs">
              + Add step
            </button>
          </div>

          <button onClick={saveSalsa} disabled={saving || !title.trim()} className="cocina-btn-primary px-5 py-2 text-sm disabled:opacity-50">
            Save salsa
          </button>
        </div>
      )}

      <div className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>{filtered.length} saved</div>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--cocina-text-soft)' }}>No salsas match this filter yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(salsa => (
            <button key={salsa.id} onClick={() => onOpenRecipe(salsa.id)} className="cocina-card text-left relative overflow-hidden">
              {salsa.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salsa.image_url} alt="" className="w-full h-28 object-cover" />
              )}
              <div className="p-4 relative">
                <button
                  onClick={(e) => deleteSalsa(salsa.id, e)}
                  className="absolute top-3 right-3"
                  style={{ color: 'var(--cocina-text-soft)' }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <div className="font-semibold pr-6" style={{ color: 'var(--cocina-heading)' }}>{salsa.title}</div>
              {salsa.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--cocina-text-soft)' }}>{salsa.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs mt-3" style={{ color: 'var(--cocina-text-soft)' }}>
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
              <div className="text-xs font-bold mt-2" style={{ color: 'var(--cocina-ochre-strong)' }}>
                {salsa.pantry_match_pct}% pantry ready
              </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
