'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { API } from '@/lib/api';

type Lane = 'stay' | 'internal' | 'external';

interface TrajectoryItem {
  id: number;
  lane: Lane;
  title: string;
  sort_order: number;
}

const LANES: { key: Lane; label: string }[] = [
  { key: 'stay',     label: 'Stay & Grow Here' },
  { key: 'internal', label: 'Explore Internally' },
  { key: 'external', label: 'Explore Externally' },
];

/**
 * Career Trajectory board — took over the space the old "Maintenance Chores"
 * section used on the Goals task board. Three lanes, flat card lists (no
 * per-lane status sub-columns like the goal-linked board above it), moved
 * between lanes the same way TasksBoard moves cards between statuses.
 */
export function CareerTrajectoryBoard() {
  const [items, setItems] = useState<TrajectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingIn, setAddingIn] = useState<Lane | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [dragId, setDragId] = useState<number | null>(null);
  const [overLane, setOverLane] = useState<Lane | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/client/career-trajectory`, { credentials: 'include' });
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (addingIn) setTimeout(() => inputRef.current?.focus(), 50);
  }, [addingIn]);

  async function createItem() {
    const title = newTitle.trim();
    if (!title || !addingIn) return;
    try {
      const res = await fetch(`${API}/api/client/career-trajectory`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane: addingIn, title }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(prev => [...prev, data.item]);
        setNewTitle('');
        setAddingIn(null);
      }
    } catch { /* silent */ }
  }

  async function moveItem(id: number, lane: Lane) {
    const prevItems = items;
    setItems(prev => prev.map(i => (i.id === id ? { ...i, lane } : i)));
    try {
      const res = await fetch(`${API}/api/client/career-trajectory/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane }),
      });
      if (!res.ok) setItems(prevItems);
      else fetchItems();
    } catch {
      setItems(prevItems);
    }
  }

  async function deleteItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/client/career-trajectory/${id}`, { method: 'DELETE', credentials: 'include' });
  }

  function onDragStart(id: number) { setDragId(id); }
  function onDragEnd() { setDragId(null); setOverLane(null); }
  function onDragOver(e: React.DragEvent, lane: Lane) {
    e.preventDefault();
    setOverLane(lane);
  }
  function onDrop(lane: Lane) {
    if (dragId !== null) moveItem(dragId, lane);
    setDragId(null);
    setOverLane(null);
  }

  if (loading) return <div className="text-muted-foreground text-sm p-4">Loading trajectory…</div>;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Career Trajectory
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {LANES.map(lane => {
          const laneItems = items.filter(i => i.lane === lane.key).sort((a, b) => a.sort_order - b.sort_order);
          const isOver = overLane === lane.key;
          const isAdding = addingIn === lane.key;
          return (
            <div
              key={lane.key}
              onDragOver={e => onDragOver(e, lane.key)}
              onDrop={() => onDrop(lane.key)}
              className={[
                'glass-surface rounded-xl p-3 min-h-[160px] flex flex-col gap-2 transition-all',
                isOver ? 'kanban-col-over' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {lane.label}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums">
                  {laneItems.length}
                </span>
              </div>

              {laneItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragEnd={onDragEnd}
                  className={[
                    'glass-surface rounded-lg p-2.5 cursor-grab select-none group',
                    'hover:border-primary/50 transition-all',
                    dragId === item.id ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm text-foreground leading-snug flex-1">{item.title}</p>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs leading-none ml-1 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {isAdding ? (
                <div className="space-y-1.5 mt-1">
                  <Input
                    ref={inputRef}
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') createItem();
                      if (e.key === 'Escape') setAddingIn(null);
                    }}
                    placeholder="Add a card…"
                    className="h-7 text-xs border-primary/40"
                  />
                  <div className="flex gap-1">
                    <button onClick={createItem}
                      className="text-xs px-2 py-1 rounded ctx-btn-active hover:opacity-90">
                      Add
                    </button>
                    <button onClick={() => setAddingIn(null)}
                      className="text-xs px-2 py-1 rounded border border-primary/20 text-muted-foreground hover:text-foreground">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingIn(lane.key); setNewTitle(''); }}
                  className="text-xs text-muted-foreground hover:ctx-text mt-auto pt-1 text-left hover:opacity-80 transition-opacity"
                >
                  + Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
