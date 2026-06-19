'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api';

interface Goal {
  id: number;
  title: string;
  description: string;
  category_name: string | null;
  progress: number;
  status: string;
}

interface EditForm { title: string; description: string; progress: string; }

export function GoalsWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', progress: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/client/goals`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setGoals(d.goals ?? []))
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(g: Goal) {
    setEditingId(g.id);
    setEditForm({ title: g.title, description: g.description ?? '', progress: String(g.progress) });
    setSaveError('');
  }

  function cancelEdit() { setEditingId(null); setSaveError(''); }

  async function saveEdit(goalId: number) {
    const progressNum = parseInt(editForm.progress, 10);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      setSaveError('Progress must be 0–100.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${API}/api/client/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editForm.title, description: editForm.description, progress: progressNum }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || 'Save failed.'); return; }
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, title: data.goal.title, description: data.goal.description, progress: data.goal.progress } : g
      ));
      setEditingId(null);
    } catch { setSaveError('Network error.'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-muted-foreground text-sm p-2">Loading goals…</div>;
  if (fetchError) return <div className="text-destructive text-sm p-2">Goals error: {fetchError}</div>;
  if (goals.length === 0) return <div className="text-muted-foreground text-sm p-2">No goals found.</div>;

  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <div key={goal.id} className="rounded-lg border border-primary/30 bg-card/60 backdrop-blur p-4">
          {editingId === goal.id ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="border-primary/40" disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} disabled={saving}
                  className="w-full rounded-md border border-primary/40 px-3 py-2 text-sm disabled:opacity-50 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Progress (0–100)</label>
                <Input type="number" min={0} max={100} value={editForm.progress}
                  onChange={e => setEditForm(f => ({ ...f, progress: e.target.value }))}
                  className="border-primary/40 w-28" disabled={saving} />
              </div>
              {saveError && <p className="text-destructive text-xs">{saveError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(goal.id)} disabled={saving}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-base font-semibold text-secondary leading-tight">{goal.title}</h3>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded border border-primary/40 text-primary">{goal.status}</span>
                  <button onClick={() => startEdit(goal)}
                    className="text-xs px-2 py-0.5 rounded border border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
              {goal.description && <p className="text-muted-foreground text-sm mb-3">{goal.description}</p>}
              <div className="flex items-center gap-3">
                <Progress value={goal.progress} className="flex-1 h-2" />
                <span className="text-sm font-medium tabular-nums">{goal.progress}%</span>
              </div>
              {goal.category_name && <p className="text-xs text-muted-foreground mt-1">{goal.category_name}</p>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
