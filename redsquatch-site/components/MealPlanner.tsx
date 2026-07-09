'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Trash2, Copy, Download, ListChecks, X } from 'lucide-react';
import { API } from '@/lib/api';

interface Meal {
  id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_name: string;
  recipe_url: string | null;
  ingredients: string | null;
  notes: string | null;
}

interface GroceryItem {
  item: string;
  qty: string;
  checked: boolean;
}

interface GroceryList {
  id: number;
  name: string;
  items: GroceryItem[];
  created_at: string;
}

const MEAL_TYPES: { key: Meal['meal_type']; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { key: 'lunch', label: 'Lunch', emoji: '🥙' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { key: 'snack', label: 'Snack', emoji: '🍿' },
];

const fmtISO = (d: Date) => d.toISOString().split('T')[0];

const mondayOf = (d: Date): Date => {
  const copy = new Date(d);
  const dow = copy.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (d: Date, days: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const weekDays = (weekStart: Date): Date[] => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const fmtDayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function MealPlanner() {
  const [weekStart, setWeekStart] = useState<Date>(mondayOf(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingCell, setEditingCell] = useState<{ date: string; mealType: Meal['meal_type']; meal?: Meal } | null>(null);
  const [form, setForm] = useState({ meal_name: '', recipe_url: '', ingredients: '', notes: '' });

  const [groceryItems, setGroceryItems] = useState<GroceryItem[] | null>(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [showSavedLists, setShowSavedLists] = useState(false);
  const [savedLists, setSavedLists] = useState<GroceryList[]>([]);
  const [expandedListId, setExpandedListId] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const days = weekDays(weekStart);
  const rangeStart = fmtISO(weekStart);
  const rangeEnd = fmtISO(addDays(weekStart, 6));

  const loadMeals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/meals?start=${rangeStart}&end=${rangeEnd}`, { credentials: 'include' });
      const data = await res.json();
      setMeals(data?.meals || []);
    } catch {
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
    setGroceryItems(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart]);

  const mealFor = (date: string, mealType: string) =>
    meals.find((m) => m.date.slice(0, 10) === date && m.meal_type === mealType);

  const openCell = (date: string, mealType: Meal['meal_type']) => {
    const existing = mealFor(date, mealType);
    setEditingCell({ date, mealType, meal: existing });
    setForm({
      meal_name: existing?.meal_name || '',
      recipe_url: existing?.recipe_url || '',
      ingredients: existing?.ingredients || '',
      notes: existing?.notes || '',
    });
  };

  const saveMeal = async () => {
    if (!editingCell || !form.meal_name.trim()) return;
    const payload = {
      date: editingCell.date,
      meal_type: editingCell.mealType,
      meal_name: form.meal_name.trim(),
      recipe_url: form.recipe_url.trim() || null,
      ingredients: form.ingredients.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (editingCell.meal) {
        await fetch(`${API}/api/client/meals/${editingCell.meal.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API}/api/client/meals`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setEditingCell(null);
      loadMeals();
    } catch {
      // leave panel open so user can retry
    }
  };

  const deleteMeal = async () => {
    if (!editingCell?.meal) return;
    try {
      await fetch(`${API}/api/client/meals/${editingCell.meal.id}`, { method: 'DELETE', credentials: 'include' });
      setEditingCell(null);
      loadMeals();
    } catch {
      // ignore
    }
  };

  const generateGroceryList = async () => {
    setGroceryLoading(true);
    setShowSavedLists(false);
    try {
      const res = await fetch(`${API}/api/client/meals/grocery-list?start=${rangeStart}&end=${rangeEnd}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setGroceryItems(data?.items || []);
    } catch {
      setGroceryItems([]);
    } finally {
      setGroceryLoading(false);
    }
  };

  const toggleGroceryItem = (idx: number) => {
    if (!groceryItems) return;
    setGroceryItems(groceryItems.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it)));
  };

  const copyGroceryList = async () => {
    if (!groceryItems) return;
    const text = groceryItems.map((i) => i.item).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API}/api/client/meals/grocery-list/export?start=${rangeStart}&end=${rangeEnd}`, {
        credentials: 'include',
      });
      const data = await res.json();
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grocery-list-${rangeStart}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const saveGroceryList = async () => {
    if (!groceryItems) return;
    try {
      await fetch(`${API}/api/client/meals/grocery-list`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Week of ${rangeStart}`, items: groceryItems }),
      });
      if (showSavedLists) loadSavedLists();
    } catch {
      // ignore
    }
  };

  const loadSavedLists = async () => {
    try {
      const res = await fetch(`${API}/api/client/meals/grocery-lists`, { credentials: 'include' });
      const data = await res.json();
      setSavedLists(data?.lists || []);
    } catch {
      setSavedLists([]);
    }
  };

  const toggleSavedLists = () => {
    const next = !showSavedLists;
    setShowSavedLists(next);
    if (next) loadSavedLists();
  };

  const toggleSavedItem = async (list: GroceryList, idx: number) => {
    const items = list.items.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it));
    setSavedLists(savedLists.map((l) => (l.id === list.id ? { ...l, items } : l)));
    try {
      await fetch(`${API}/api/client/meals/grocery-lists/${list.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch {
      // ignore
    }
  };

  const deleteSavedList = async (id: number) => {
    try {
      await fetch(`${API}/api/client/meals/grocery-lists/${id}`, { method: 'DELETE', credentials: 'include' });
      setSavedLists(savedLists.filter((l) => l.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full">
      {/* Header / week nav */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Meal Planner
        </h1>
        <div className="flex items-center gap-2">
          <button className="glass-btn p-2 rounded-lg" onClick={() => setWeekStart(addDays(weekStart, -7))} title="Previous week">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm px-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {fmtDayLabel(days[0])} – {fmtDayLabel(days[6])}
          </span>
          <button className="glass-btn p-2 rounded-lg" onClick={() => setWeekStart(mondayOf(new Date()))} title="This week">
            Today
          </button>
          <button className="glass-btn p-2 rounded-lg" onClick={() => setWeekStart(addDays(weekStart, 7))} title="Next week">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(7, minmax(110px, 1fr))`, minWidth: '760px' }}>
            <div />
            {days.map((d) => (
              <div key={fmtISO(d)} className="text-center text-xs font-semibold py-2" style={{ color: '#d4a373' }}>
                {fmtDayLabel(d)}
              </div>
            ))}

            {MEAL_TYPES.map(({ key, label, emoji }) => (
              <React.Fragment key={key}>
                <div className="flex items-center text-xs font-semibold py-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {emoji} {label}
                </div>
                {days.map((d) => {
                  const dateStr = fmtISO(d);
                  const meal = mealFor(dateStr, key);
                  const isEditing = editingCell?.date === dateStr && editingCell?.mealType === key;
                  return (
                    <div
                      key={dateStr}
                      onClick={() => openCell(dateStr, key)}
                      className="rounded-lg p-2 min-h-[56px] cursor-pointer transition-colors text-xs"
                      style={{
                        background: isEditing ? 'rgba(184,115,51,0.14)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isEditing ? '#b87333' : 'rgba(184,115,51,0.18)'}`,
                      }}
                    >
                      {meal ? (
                        <div>
                          <div style={{ color: '#d4a373' }}>{meal.meal_name}</div>
                          {meal.recipe_url && (
                            <a
                              href={meal.recipe_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-1"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              <ExternalLink size={10} /> recipe
                            </a>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.25)' }}>+ add</span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Inline edit panel */}
          {editingCell && (
            <div className="glass-surface rounded-xl p-4 mt-4" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: '#d4a373' }}>
                  {editingCell.meal ? 'Edit' : 'Add'} {MEAL_TYPES.find((m) => m.key === editingCell.mealType)?.label} —{' '}
                  {editingCell.date}
                </h3>
                <button onClick={() => setEditingCell(null)}>
                  <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Meal name"
                value={form.meal_name}
                onChange={(e) => setForm({ ...form, meal_name: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded mb-2 text-sm"
              />
              <input
                type="url"
                placeholder="Recipe URL (optional)"
                value={form.recipe_url}
                onChange={(e) => setForm({ ...form, recipe_url: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded mb-2 text-sm"
              />
              <textarea
                placeholder="Ingredients (comma-separated)"
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded mb-2 text-sm"
                rows={2}
              />
              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="glass-input w-full px-3 py-2 rounded mb-3 text-sm"
                rows={2}
              />

              <div className="flex gap-2">
                <button onClick={saveMeal} className="glass-btn flex-1 py-2 rounded-lg text-sm font-semibold">
                  Save
                </button>
                {editingCell.meal && (
                  <button onClick={deleteMeal} className="glass-btn-danger px-4 py-2 rounded-lg text-sm">
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <button onClick={generateGroceryList} className="glass-btn w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            <ListChecks size={16} /> Generate Grocery List
          </button>
          <button onClick={toggleSavedLists} className="glass-btn w-full py-2 rounded-lg text-sm font-semibold">
            View Saved Lists
          </button>

          {groceryLoading && <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>}

          {groceryItems && !groceryLoading && (
            <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#d4a373' }}>
                This Week&apos;s List
              </h4>
              {groceryItems.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No ingredients yet — add some meals with ingredients.
                </p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto mb-3">
                  {groceryItems.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={item.checked} onChange={() => toggleGroceryItem(idx)} />
                      <span style={{ color: item.checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                        {item.item}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <button onClick={copyGroceryList} className="glass-btn px-2 py-1.5 rounded text-xs flex items-center gap-1">
                  <Copy size={12} /> {copyFeedback ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={exportCsv} className="glass-btn px-2 py-1.5 rounded text-xs flex items-center gap-1">
                  <Download size={12} /> CSV
                </button>
                <button onClick={saveGroceryList} className="glass-btn px-2 py-1.5 rounded text-xs">
                  Save List
                </button>
              </div>
            </div>
          )}

          {showSavedLists && (
            <div className="glass-surface rounded-xl p-3" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: '#d4a373' }}>
                Saved Lists
              </h4>
              {savedLists.length === 0 ? (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  No saved lists yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedLists.map((list) => (
                    <div key={list.id} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                      >
                        <span className="text-xs" style={{ color: '#d4a373' }}>{list.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedList(list.id);
                          }}
                        >
                          <Trash2 size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        </button>
                      </div>
                      {expandedListId === list.id && (
                        <div className="mt-2 space-y-1">
                          {(list.items || []).map((item, idx) => (
                            <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input type="checkbox" checked={item.checked} onChange={() => toggleSavedItem(list, idx)} />
                              <span style={{ color: item.checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                                {item.item}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Loading meals…
        </p>
      )}
    </div>
  );
}
