'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { API } from '@/lib/api';

interface Milestone {
  id: number;
  goal_id: number;
  title: string;
  sequence_order: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface Goal {
  id: number;
  title: string;
  description: string | null;
  context: string;
  category_id: number | null;
  category_name: string | null;
  target_date: string | null;
  status: string;
  progress: number;
  milestones: Milestone[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused',
  blocked: 'Blocked', 'on-hold': 'On Hold', achieved: 'Achieved', archived: 'Archived',
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = Number(params.id);

  const [goal, setGoal]       = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [archiving, setArchiving] = useState(false);
  const [toast, setToast]     = useState<string | null>(null);

  useEffect(() => {
    if (!goalId || isNaN(goalId)) {
      setError('Invalid goal ID');
      setLoading(false);
      return;
    }

    fetch(`${API}/api/client/goals`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const found = (data.goals ?? []).find((g: Goal) => g.id === goalId);
        if (!found) {
          setError('Goal not found');
        } else {
          setGoal(found);
        }
      })
      .catch(() => setError('Failed to load goal'))
      .finally(() => setLoading(false));
  }, [goalId]);

  async function handleArchive() {
    if (!confirm('Are you sure? Archived goals can be restored.')) return;
    setArchiving(true);
    try {
      const res = await fetch(`${API}/api/client/goals/${goalId}/archive`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Archive failed');
      setToast('Goal archived');
      setTimeout(() => router.push('/dashboard/goals'), 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading goal…</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="p-8">
        <p className="text-red-400">{error || 'Goal not found'}</p>
        <button
          onClick={() => router.push('/dashboard/goals')}
          className="mt-4 text-sm text-[#d4a373] hover:underline"
        >
          ← Back to goals
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-3xl mx-auto relative min-h-screen">
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-2 rounded-lg text-sm"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#86efac' }}
        >
          {toast}
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard/goals')}
        className="text-sm mb-6 hover:underline"
        style={{ color: '#d4a373' }}
      >
        ← Back to goals
      </button>

      <div className="glass-surface rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold" style={{ color: '#d4a373' }}>{goal.title}</h1>
          <span className="text-xs px-2 py-1 rounded border border-primary/30 text-muted-foreground">
            {STATUS_LABEL[goal.status] ?? goal.status}
          </span>
        </div>

        {goal.category_name && (
          <p className="text-xs text-muted-foreground">{goal.category_name}</p>
        )}

        {goal.target_date && (
          <p className="text-xs text-muted-foreground">
            Target: {new Date(goal.target_date).toLocaleDateString()}
          </p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>

        {goal.description && (
          <div className="pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h2>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{goal.description}</p>
          </div>
        )}

        {goal.milestones.length > 0 && (
          <div className="pt-6 mt-3" style={{ marginTop: '3rem' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Milestones</h2>
            <ul className="space-y-2">
              {goal.milestones.map(ms => (
                <li key={ms.id} className="flex items-center gap-2 text-sm">
                  <span style={{ color: ms.is_completed ? '#86efac' : 'rgba(255,255,255,0.3)' }}>
                    {ms.is_completed ? '✓' : '○'}
                  </span>
                  <span className={ms.is_completed ? 'line-through text-muted-foreground' : ''}>{ms.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={handleArchive}
        disabled={archiving}
        className="fixed bottom-28 right-6 z-40 px-5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          background: 'transparent',
          border: '1px solid #996515',
          color: '#d4a373',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(153,101,21,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {archiving ? 'Archiving…' : 'Archive'}
      </button>
    </div>
  );
}
