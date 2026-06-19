'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import type { ResearchEntry } from '@/components/ResearchTab';
import GoalCreationModal from '@/components/GoalCreationModal';

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Shelved'];
const RECOMMENDATIONS = ['Adopt', 'Experiment', 'Monitor', 'Reject'];

const TEXT_FIELDS: { key: keyof ResearchEntry; label: string; rows?: number }[] = [
  { key: 'executive_summary', label: 'Executive Summary', rows: 4 },
  { key: 'definition', label: 'Definition', rows: 3 },
  { key: 'core_mechanics', label: 'Core Mechanics', rows: 3 },
  { key: 'pricing_cost_structure', label: 'Pricing / Cost Structure', rows: 3 },
  { key: 'use_case_1', label: 'Use Case 1', rows: 3 },
  { key: 'use_case_2', label: 'Use Case 2', rows: 3 },
  { key: 'current_vs_new_process', label: 'Current vs New Process', rows: 3 },
  { key: 'pros_strengths', label: 'Pros / Strengths', rows: 3 },
  { key: 'cons_risks_limitations', label: 'Cons / Risks / Limitations', rows: 3 },
  { key: 'next_steps', label: 'Next Steps', rows: 3 },
];

interface Props {
  entry: ResearchEntry;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ResearchModal({ entry, onClose, onRefresh }: Props) {
  const [form, setForm]               = useState<ResearchEntry>(entry);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showGoalModal, setShowGoal]  = useState(false);

  useEffect(() => { setForm(entry); setDirty(false); }, [entry]);

  const handleChange = (field: keyof ResearchEntry, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/client/research/${form.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      const data = await res.json();
      setForm(data.entry);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Flag this research entry for deletion?')) return;
    try {
      const res = await fetch(`${API}/api/client/research/${form.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-panel research-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Research Entry</h2>
          </div>

          <div className="modal-body">
            {error && <p className="modal-error">{error}</p>}

            <div className="modal-field">
              <label>Topic Name *</label>
              <input
                className="ghost-input"
                value={form.topic_name}
                onChange={e => handleChange('topic_name', e.target.value)}
              />
            </div>

            <div className="modal-row">
              <div className="modal-field">
                <label>Requested By</label>
                <input className="ghost-input" value={form.requested_by ?? ''} onChange={e => handleChange('requested_by', e.target.value)} />
              </div>
              <div className="modal-field">
                <label>Date Requested</label>
                <input type="date" className="ghost-input" value={form.date_requested?.slice(0, 10) ?? ''} onChange={e => handleChange('date_requested', e.target.value)} />
              </div>
              <div className="modal-field">
                <label>Evaluated By</label>
                <input className="ghost-input" value={form.evaluated_by ?? ''} onChange={e => handleChange('evaluated_by', e.target.value)} />
              </div>
            </div>

            <div className="modal-row">
              <div className="modal-field">
                <label>Status *</label>
                <select className="ghost-input" value={form.status} onChange={e => handleChange('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <label>Recommendation</label>
                <select className="ghost-input" value={form.recommendation ?? ''} onChange={e => handleChange('recommendation', e.target.value)}>
                  <option value="">—</option>
                  {RECOMMENDATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {TEXT_FIELDS.map(({ key, label, rows = 3 }) => (
              <div key={key} className="modal-field">
                <label>{label}</label>
                <textarea
                  className="ghost-input ghost-textarea"
                  rows={rows}
                  value={(form[key] as string) ?? ''}
                  onChange={e => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {dirty && (
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
            <button type="button" className="btn-primary" onClick={() => setShowGoal(true)}>Convert to Goal</button>
            <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>

      {showGoalModal && (
        <GoalCreationModal
          research={form}
          onClose={() => setShowGoal(false)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
