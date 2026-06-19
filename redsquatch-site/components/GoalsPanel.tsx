'use client';

import { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AppContext } from '@/components/ContextSwitcher';

import { API } from '@/lib/api';

interface Category { id: number; parent_context: string; sub_type: string; }
interface Milestone { id: number; goal_id: number; title: string; sequence_order: number; is_completed: boolean; completed_at: string | null; }
interface Goal {
  id: number; title: string; description: string; context: string;
  category_id: number | null; category_name: string | null;
  target_date: string | null; status: string; progress: number;
  milestones: Milestone[];
}

const STATUSES = ['draft','active','paused','blocked','on-hold','achieved'] as const;
type GoalStatus = typeof STATUSES[number];

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused',
  blocked: 'Blocked', 'on-hold': 'On Hold', achieved: 'Achieved',
};

interface GoalFormState {
  title: string; description: string; status: GoalStatus;
  category_id: string; target_date: string;
}

const BLANK_FORM: GoalFormState = { title: '', description: '', status: 'draft', category_id: '', target_date: '' };

interface Props { context: AppContext; }

export function GoalsPanel({ context }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GoalFormState>(BLANK_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [newMilestone, setNewMilestone] = useState<Record<number, string>>({});

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/goals?context=${context}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGoals(data.goals ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [context]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/client/goal-categories?context=${context}`, { credentials: 'include' });
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch { /* silent */ }
  }, [context]);

  useEffect(() => {
    fetchGoals();
    fetchCategories();
  }, [fetchGoals, fetchCategories]);

  function startCreate() {
    setEditId(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  }

  function startEdit(g: Goal) {
    setEditId(g.id);
    setForm({
      title: g.title, description: g.description ?? '', status: (g.status as GoalStatus) ?? 'active',
      category_id: g.category_id ? String(g.category_id) : '',
      target_date: g.target_date ? g.target_date.slice(0, 10) : '',
    });
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); }

  async function submitForm() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description,
        context,
        status: form.status,
        category_id: form.category_id ? Number(form.category_id) : null,
        target_date: form.target_date || null,
      };
      const url = editId ? `${API}/api/client/goals/${editId}` : `${API}/api/client/goals`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchGoals();
      setShowForm(false);
      setEditId(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id: number) {
    if (!confirm('Archive this goal?')) return;
    try {
      await fetch(`${API}/api/client/goals/${id}`, { method: 'DELETE', credentials: 'include' });
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch { alert('Delete failed'); }
  }

  function toggleExpand(id: number) {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function toggleMilestone(ms: Milestone) {
    try {
      const res = await fetch(`${API}/api/client/milestones/${ms.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !ms.is_completed }),
      });
      if (!res.ok) return;
      await fetchGoals();
    } catch { /* silent */ }
  }

  async function addMilestone(goalId: number) {
    const title = (newMilestone[goalId] ?? '').trim();
    if (!title) return;
    try {
      await fetch(`${API}/api/client/milestones`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId, title }),
      });
      setNewMilestone(prev => ({ ...prev, [goalId]: '' }));
      await fetchGoals();
    } catch { alert('Failed to add milestone'); }
  }

  async function deleteMilestone(msId: number) {
    try {
      await fetch(`${API}/api/client/milestones/${msId}`, { method: 'DELETE', credentials: 'include' });
      await fetchGoals();
    } catch { /* silent */ }
  }

  if (loading) return <div className="text-muted-foreground text-sm p-4">Loading goals…</div>;
  if (error)   return <div className="text-red-400 text-sm p-4">Error: {error}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'hsl(var(--secondary))' }}>
          Goals
        </h2>
        <Button
          size="sm"
          onClick={startCreate}
          className="bg-primary hover:bg-primary/80 text-primary-foreground"
        >
          + Add Goal
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--secondary))' }}>
            {editId ? 'Edit Goal' : 'New Goal'}
          </h3>
          <Input
            placeholder="Goal title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="border-primary/40"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="glass-input w-full rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as GoalStatus }))}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.sub_type}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Target Date</label>
            <Input
              type="date"
              value={form.target_date}
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              className="border-primary/40 w-48"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={submitForm} disabled={saving}
              className="bg-primary hover:bg-primary/80 text-primary-foreground">
              {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelForm} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 && !showForm && (
        <div className="glass-card text-muted-foreground text-sm p-4 text-center rounded-xl">
          No {context} goals yet — add one above.
        </div>
      )}

      {goals.map(goal => {
        const expanded = expandedGoals.has(goal.id);
        return (
          <div key={goal.id} className="glass-card rounded-xl p-4 space-y-3">
            {/* Goal header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-semibold truncate" style={{ color: 'hsl(var(--secondary))' }}>
                    {goal.title}
                  </h3>
                  {goal.category_name && (
                    <span className="ctx-badge text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                      {goal.category_name}
                    </span>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded border font-medium shrink-0"
                    style={{ borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}
                  >
                    {STATUS_LABEL[goal.status] ?? goal.status}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => startEdit(goal)}
                  className="text-xs px-2 py-1 rounded border border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-xs px-2 py-1 rounded border border-red-900/40 text-red-400 hover:border-red-500/60 transition-colors"
                >
                  Del
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <Progress value={goal.progress} className="flex-1 h-1.5" />
              <span className="text-xs font-medium tabular-nums text-muted-foreground w-8 text-right">
                {goal.progress}%
              </span>
            </div>

            {/* Target date */}
            {goal.target_date && (
              <p className="text-xs text-muted-foreground">
                Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}

            {/* Milestones toggle */}
            <button
              onClick={() => toggleExpand(goal.id)}
              className="ctx-text text-xs font-medium hover:opacity-80 flex items-center gap-1"
            >
              <span>{expanded ? '▼' : '▶'}</span>
              <span>Milestones ({goal.milestones.length})</span>
            </button>

            {expanded && (
              <div className="pl-3 border-l-2 space-y-2" style={{ borderColor: 'var(--ctx-accent)' }}>
                {goal.milestones.length === 0 && (
                  <p className="text-muted-foreground text-xs">No milestones yet.</p>
                )}
                {goal.milestones.map(ms => (
                  <div key={ms.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => toggleMilestone(ms)}
                      className={[
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                        ms.is_completed
                          ? 'border-transparent'
                          : 'border-primary/40 bg-transparent hover:border-primary/70',
                      ].join(' ')}
                      style={ms.is_completed ? { backgroundColor: 'var(--ctx-accent)', borderColor: 'var(--ctx-accent)' } : {}}
                    >
                      {ms.is_completed && <span className="text-[10px] text-black">✓</span>}
                    </button>
                    <span className={`text-sm flex-1 ${ms.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {ms.title}
                    </span>
                    <button
                      onClick={() => deleteMilestone(ms.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 text-xs hover:text-red-300 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {/* Add milestone */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Add milestone…"
                    value={newMilestone[goal.id] ?? ''}
                    onChange={e => setNewMilestone(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addMilestone(goal.id); }}
                    className="border-primary/30 text-xs h-7 px-2"
                  />
                  <button
                    onClick={() => addMilestone(goal.id)}
                    className="text-xs px-2 py-1 rounded border ctx-border ctx-text hover:opacity-80 transition-colors whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
