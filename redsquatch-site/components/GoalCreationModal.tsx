'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import type { ResearchEntry } from '@/components/ResearchTab';

interface Category {
  id: number;
  parent_context: string;
  sub_type: string;
}

function mapResearchStatusToGoal(status: string): string {
  if (status === 'Completed') return 'achieved';
  return 'active';
}

interface Props {
  research: ResearchEntry;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GoalCreationModal({ research, onClose, onSuccess }: Props) {
  const [title, setTitle]             = useState(research.topic_name);
  const [description, setDescription] = useState(
    `${research.executive_summary ?? ''}\n\nRecommendation: ${research.recommendation ?? '—'}`.trim()
  );
  const [status, setStatus]           = useState(mapResearchStatusToGoal(research.status));
  const [categoryId, setCategoryId]   = useState('');
  const [targetDate, setTargetDate]   = useState('');
  const [owner, setOwner]             = useState('');
  const [categories, setCategories]   = useState<Category[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/client/goal-categories?context=work`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const goalBody = {
        title: title.trim(),
        description: description.trim() || null,
        context: 'work',
        status,
        category_id: categoryId ? Number(categoryId) : null,
        target_date: targetDate || null,
      };

      const goalRes = await fetch(`${API}/api/client/goals`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalBody),
      });
      if (!goalRes.ok) {
        const data = await goalRes.json();
        throw new Error(data.error || 'Failed to create goal');
      }
      const { goal } = await goalRes.json();

      const convertRes = await fetch(`${API}/api/client/research/${research.id}/convert-to-goal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goal.id }),
      });
      if (!convertRes.ok) {
        const data = await convertRes.json();
        throw new Error(data.error || 'Failed to link research to goal');
      }

      setToast('Goal created and research flagged for deletion');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel goal-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Goal from Research</h2>
        </div>

        <div className="modal-body">
          {error && <p className="modal-error">{error}</p>}
          {toast && <p className="modal-success">{toast}</p>}

          <div className="modal-field">
            <label>Goal Title *</label>
            <input className="ghost-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="modal-field">
            <label>Goal Description</label>
            <textarea className="ghost-input ghost-textarea" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label>Status</label>
              <select className="ghost-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="blocked">Blocked</option>
                <option value="on-hold">On Hold</option>
                <option value="achieved">Achieved</option>
              </select>
            </div>
            <div className="modal-field">
              <label>Category</label>
              <select className="ghost-input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.sub_type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label>Target Date</label>
              <input type="date" className="ghost-input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Owner</label>
              <input className="ghost-input" value={owner} onChange={e => setOwner(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleCreate} disabled={saving || !title.trim()}>
            {saving ? 'Creating…' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}
