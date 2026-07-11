'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import CopperPanel from '@/components/cenote/CopperPanel';

import { API } from '@/lib/api';

interface ArchivedGoal {
  id: number;
  title: string;
  description: string | null;
  context: string;
  category_name: string | null;
  status: string;
  progress: number;
  archived_at: string;
  target_date: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused',
  blocked: 'Blocked', 'on-hold': 'On Hold', achieved: 'Achieved',
};

const CTX_LABEL: Record<string, string> = {
  work: '💼 Work', home: '🏠 Home', personal: '⚡ Personal',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function ArchivePage() {
  const [goals, setGoals] = useState<ArchivedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/api/client/goals/archived`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setGoals(d.goals ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function restore(id: number) {
    setBusy(id);
    try {
      const res = await fetch(`${API}/api/client/goals/${id}/restore`, {
        method: 'PUT', credentials: 'include',
      });
      if (!res.ok) throw new Error('Restore failed');
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(null);
    }
  }

  async function permanentDelete(id: number) {
    setBusy(id);
    try {
      const res = await fetch(`${API}/api/client/goals/${id}/permanent`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading archive…</div>;
  if (error)   return <div className="p-6 text-red-400">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <CopperPanel>
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Goal Archive
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {goals.length} archived goal{goals.length !== 1 ? 's' : ''} — restore or permanently remove them below.
        </p>
      </CopperPanel>

      {goals.length === 0 && (
        <div className="glass-surface rounded-xl p-8 text-center text-muted-foreground">
          No archived goals. Goals you delete from the Goals view will appear here.
        </div>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const isBusy = busy === goal.id;
          const isConfirming = confirming === goal.id;

          return (
            <div
              key={goal.id}
              className="glass-surface rounded-xl p-4 opacity-75 hover:opacity-90 transition-opacity"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: goal info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-base font-semibold text-muted-foreground line-through truncate">
                      {goal.title}
                    </h3>
                    {/* Context chip */}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {CTX_LABEL[goal.context] ?? goal.context}
                    </span>
                    {/* Category chip */}
                    {goal.category_name && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-primary/15 shrink-0">
                        {goal.category_name}
                      </span>
                    )}
                    {/* Status chip */}
                    <span className="text-[11px] px-2 py-0.5 rounded border border-primary/25 text-muted-foreground shrink-0">
                      {STATUS_LABEL[goal.status] ?? goal.status}
                    </span>
                  </div>

                  {goal.description && (
                    <p className="text-sm text-muted-foreground/70 line-clamp-2">{goal.description}</p>
                  )}

                  {/* Progress */}
                  <div className="flex items-center gap-3 max-w-xs">
                    <Progress value={goal.progress} className="flex-1 h-1.5 opacity-50" />
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {goal.progress}%
                    </span>
                  </div>

                  {/* Archived date */}
                  <p className="text-xs text-muted-foreground/60">
                    Archived {formatDate(goal.archived_at)}
                    {goal.target_date && (
                      <span className="ml-2 opacity-70">
                        · Target was {formatDate(goal.target_date)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Restore */}
                  <button
                    onClick={() => restore(goal.id)}
                    disabled={isBusy}
                    className="text-xs px-3 py-1.5 rounded border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {isBusy && busy === goal.id ? '…' : '↩ Restore'}
                  </button>

                  {/* Delete — two-step confirm */}
                  {isConfirming ? (
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[11px] text-red-400">Sure?</span>
                      <button
                        onClick={() => permanentDelete(goal.id)}
                        disabled={isBusy}
                        className="text-[11px] px-2 py-1 rounded bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-900/60 disabled:opacity-40 transition-colors"
                      >
                        {isBusy ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        className="text-[11px] px-2 py-1 rounded border border-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(goal.id)}
                      disabled={isBusy}
                      className="text-xs px-3 py-1.5 rounded border border-red-900/40 text-red-400/70 hover:text-red-400 hover:border-red-700/60 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      ✕ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
