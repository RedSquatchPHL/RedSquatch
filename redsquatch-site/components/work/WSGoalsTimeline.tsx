'use client';

import { useEffect, useState, useCallback } from 'react';
import { API } from '@/lib/api';
import s from './WSGoalsTimeline.module.css';

type AppContext = 'work' | 'home' | 'personal';
const CONTEXTS: { value: AppContext; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'home', label: 'Home' },
  { value: 'personal', label: 'Personal' },
];

interface Category { id: number; parent_context: string; sub_type: string; }
interface Milestone { id: number; goal_id: number; title: string; sequence_order: number; is_completed: boolean; completed_at: string | null; }
interface Goal {
  id: number; title: string; description: string; context: string;
  category_id: number | null; category_name: string | null;
  target_date: string | null; status: string; progress: number;
  milestones: Milestone[];
}

const STATUSES = ['draft', 'active', 'paused', 'blocked', 'on-hold', 'achieved'] as const;
type GoalStatus = typeof STATUSES[number];
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused',
  blocked: 'Blocked', 'on-hold': 'On Hold', achieved: 'Achieved',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'var(--status-green)', achieved: 'var(--copper-accent)',
  blocked: 'var(--status-red)', paused: 'var(--status-yellow)',
  'on-hold': 'var(--status-yellow)', draft: 'var(--ink-muted)',
};

interface GoalFormState {
  title: string; description: string; status: GoalStatus;
  category_id: string; target_date: string;
}
const BLANK_FORM: GoalFormState = { title: '', description: '', status: 'draft', category_id: '', target_date: '' };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WSGoalsTimeline() {
  const [context, setContext] = useState<AppContext>('work');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GoalFormState>(BLANK_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newMilestone, setNewMilestone] = useState<Record<number, string>>({});

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/goals?context=${context}`, { credentials: 'include' });
      const data = await res.json();
      setGoals(data.goals ?? []);
    } catch { /* leave previous list in place */ } finally {
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

  useEffect(() => { fetchGoals(); fetchCategories(); }, [fetchGoals, fetchCategories]);

  function startCreate() { setEditId(null); setForm(BLANK_FORM); setShowForm(true); }
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
        title: form.title.trim(), description: form.description, context,
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

  const dated = goals.filter(g => g.target_date).sort((a, b) => (a.target_date! < b.target_date! ? -1 : 1));
  const undated = goals.filter(g => !g.target_date);

  function renderEntry(goal: Goal) {
    const expanded = expandedId === goal.id;
    return (
      <div key={goal.id} className={s.entry}>
        <div className={s.entryDot} aria-hidden="true" />
        <div className={s.entryCard}>
          {goal.target_date && <div className={s.entryDate}>{formatDate(goal.target_date)}</div>}
          <div
            className={s.entryHead}
            onClick={() => setExpandedId(expanded ? null : goal.id)}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expanded ? null : goal.id); } }}
          >
            <div className={s.entryTitleRow}>
              <span className={s.entryTitle}>{goal.title}</span>
              {goal.category_name && <span className={s.categoryTag}>{goal.category_name}</span>}
              <span className={s.statusTag} style={{ color: STATUS_COLOR[goal.status] ?? 'var(--ink-muted)', borderColor: STATUS_COLOR[goal.status] ?? 'var(--panel-border)' }}>
                {STATUS_LABEL[goal.status] ?? goal.status}
              </span>
            </div>
            <div className={s.entryRight}>
              <span className={s.pct}>{goal.progress}%</span>
              <span className={s.chevron}>{expanded ? '▾' : '▸'}</span>
            </div>
          </div>
          <div className={s.track}><div className={s.fill} style={{ width: `${goal.progress}%` }} /></div>

          {expanded && (
            <div className={s.detail}>
              {goal.description && <p className={s.description}>{goal.description}</p>}

              {goal.milestones.length === 0 && <p className={s.description}>No milestones yet.</p>}
              {goal.milestones.map(ms => (
                <div key={ms.id} className={s.milestoneRow}>
                  <button
                    className={`${s.checkbox} ${ms.is_completed ? s.checkboxDone : ''}`}
                    onClick={() => toggleMilestone(ms)}
                    aria-label={ms.is_completed ? `Mark "${ms.title}" incomplete` : `Mark "${ms.title}" complete`}
                  >
                    {ms.is_completed && '✓'}
                  </button>
                  <span className={`${s.milestoneTitle} ${ms.is_completed ? s.milestoneTitleDone : ''}`}>{ms.title}</span>
                  <button className={s.msDeleteBtn} onClick={() => deleteMilestone(ms.id)} aria-label={`Delete milestone "${ms.title}"`}>✕</button>
                </div>
              ))}
              <div className={s.addMsRow}>
                <input
                  className={s.msInput}
                  placeholder="Add milestone…"
                  value={newMilestone[goal.id] ?? ''}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, [goal.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') addMilestone(goal.id); }}
                />
                <button className={s.secondaryBtn} onClick={() => addMilestone(goal.id)}>Add</button>
              </div>

              <div className={s.entryFooter}>
                <button className={s.secondaryBtn} onClick={() => startEdit(goal)}>Edit</button>
                <button className={s.secondaryBtn} onClick={() => deleteGoal(goal.id)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <div className={s.topBar}>
        <div className={s.ctxSwitch}>
          {CONTEXTS.map(c => (
            <button
              key={c.value}
              className={`${s.ctxBtn} ${context === c.value ? s.ctxBtnActive : ''}`}
              onClick={() => setContext(c.value)}
              aria-pressed={context === c.value}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button className={s.addBtn} onClick={startCreate}>+ Add Goal</button>
      </div>

      {showForm && (
        <div className={s.form}>
          <h3 className={s.formTitle}>{editId ? 'Edit Goal' : 'New Goal'}</h3>
          <input
            className={s.input}
            placeholder="Goal title *"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <textarea
            className={s.textarea}
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className={s.formRow}>
            <div>
              <label className={s.fieldLabel}>Status</label>
              <select className={s.select} value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as GoalStatus }))}>
                {STATUSES.map(st => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
              </select>
            </div>
            <div>
              <label className={s.fieldLabel}>Category</label>
              <select className={s.select} value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.sub_type}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={s.fieldLabel}>Target Date</label>
            <input type="date" className={s.input} style={{ width: '12rem' }} value={form.target_date} onChange={(e) => setForm(f => ({ ...f, target_date: e.target.value }))} />
          </div>
          <div className={s.formActions}>
            <button className={s.primaryBtn} onClick={submitForm} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Create'}</button>
            <button className={s.secondaryBtn} onClick={cancelForm} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={s.emptyNote}>Loading…</div>
      ) : goals.length === 0 ? (
        <div className={s.emptyNote}>No {context} goals yet — add one above.</div>
      ) : (
        <div className={s.timeline}>
          {dated.length > 0 && (
            <>
              <div className={s.sectionLabel}>Upcoming</div>
              {dated.map(renderEntry)}
            </>
          )}
          {undated.length > 0 && (
            <>
              <div className={s.sectionLabel}>Undated</div>
              {undated.map(renderEntry)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
