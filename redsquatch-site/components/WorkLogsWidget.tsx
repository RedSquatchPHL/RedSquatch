// File: /root/n8n-docker/redsquatch-site/components/WorkLogsWidget.tsx
'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

type IntakeType = 'demand' | 'project' | 'defect' | 'story' | 'enhancement' | 'research';

type WorkStatus     = 'pending' | 'in_progress' | 'complete' | 'billed';
type ResearchStatus = 'in_progress' | 'complete' | 'pending_review';

interface WorkLog {
  id: number;
  date: string;
  project: string | null;
  intake_type: IntakeType;
  hours: string | null;
  notes: string | null;
  findings: string | null;
  status: string;
  created_at: string;
}

interface FormState {
  date: string;
  project: string;
  intake_type: IntakeType;
  hours: string;
  notes: string;
  findings: string;
  status: string;
}

const INTAKE_TYPES: { value: IntakeType; label: string }[] = [
  { value: 'demand',      label: 'Demand'      },
  { value: 'project',     label: 'Project'     },
  { value: 'defect',      label: 'Defect'      },
  { value: 'story',       label: 'Story'       },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'research',    label: 'Research'    },
];

const INTAKE_TYPE_COLORS: Record<IntakeType, string> = {
  demand:      'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  project:     'bg-copper/10 text-copper border border-copper/20',
  defect:      'bg-red-500/10 text-red-400 border border-red-500/20',
  story:       'bg-green-500/10 text-green-400 border border-green-500/20',
  enhancement: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  research:    'bg-purple-500/10 text-purple-400 border border-purple-500/20',
};

const WORK_STATUSES: WorkStatus[]         = ['pending', 'in_progress', 'complete', 'billed'];
const RESEARCH_STATUSES: ResearchStatus[] = ['in_progress', 'complete', 'pending_review'];

const STATUS_LABELS: Record<string, string> = {
  pending:        'Pending',
  in_progress:    'In Progress',
  complete:       'Complete',
  billed:         'Billed',
  pending_review: 'Pending Review',
};

const STATUS_COLORS: Record<string, string> = {
  pending:        'text-yellow-400',
  in_progress:    'text-blue-400',
  complete:       'text-green-400',
  billed:         'text-copper',
  pending_review: 'text-purple-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultStatus(type: IntakeType): string {
  return type === 'research' ? 'in_progress' : 'pending';
}

function emptyForm(type: IntakeType = 'demand'): FormState {
  return {
    date: today(),
    project: '',
    intake_type: type,
    hours: '',
    notes: '',
    findings: '',
    status: defaultStatus(type),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WorkLogsWidgetProps {
  defaultTab?: IntakeType;
}

export default function WorkLogsWidget({ defaultTab = 'demand' }: WorkLogsWidgetProps) {
  const [logs, setLogs]             = useState<WorkLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(emptyForm(defaultTab));
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [filterType, setFilterType] = useState<IntakeType | 'all'>('all');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filterType !== 'all' ? `?intake_type=${filterType}` : '';
      const res = await fetch(`${API}/api/client/lincoln/logs${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filterType]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleField = (field: keyof FormState, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'intake_type') {
        updated.status = defaultStatus(value as IntakeType);
      }
      return updated;
    });
  };

  const openNew = () => {
    setEditingId(null);
    const startType = filterType !== 'all' ? filterType : defaultTab;
    setForm(emptyForm(startType));
    setShowForm(true);
  };

  const openEdit = (log: WorkLog) => {
    setForm({
      date:        log.date.slice(0, 10),
      project:     log.project ?? '',
      intake_type: log.intake_type,
      hours:       log.hours ?? '',
      notes:       log.notes ?? '',
      findings:    log.findings ?? '',
      status:      log.status,
    });
    setEditingId(log.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(defaultTab));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        hours:    form.hours ? parseFloat(form.hours) : null,
        project:  form.project  || null,
        notes:    form.notes    || null,
        findings: form.intake_type === 'research' ? (form.findings || null) : null,
      };
      const url    = editingId ? `${API}/api/client/lincoln/logs/${editingId}` : `${API}/api/client/lincoln/logs`;
      const method = editingId ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      cancelForm();
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this log entry?')) return;
    try {
      const res = await fetch(`${API}/api/client/lincoln/logs/${id}`, {
        method:      'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const statuses = form.intake_type === 'research' ? RESEARCH_STATUSES : WORK_STATUSES;
  const totalHours = logs.reduce((acc, l) => acc + parseFloat(l.hours ?? '0'), 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Filter bar + actions ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filterType === 'all'
                ? 'bg-[rgba(184,115,51,0.25)] text-copper'
                : 'text-light-copper hover:bg-[rgba(255,255,255,0.04)]'
            }`}
          >
            All
          </button>
          {INTAKE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filterType === t.value
                  ? 'bg-[rgba(184,115,51,0.25)] text-copper'
                  : 'text-light-copper hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <span className="text-xs text-light-copper">
              {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
              {totalHours > 0 && ` · ${totalHours.toFixed(1)}h`}
            </span>
          )}
          <Button
            onClick={openNew}
            size="sm"
            className="bg-[rgba(184,115,51,0.2)] hover:bg-[rgba(184,115,51,0.35)] text-copper border border-[rgba(184,115,51,0.3)]"
          >
            + New Entry
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* ── Inline form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-lg border border-[rgba(184,115,51,0.3)] bg-[rgba(255,255,255,0.03)] p-5">
          <h3 className="text-copper font-medium text-sm uppercase tracking-wider mb-4">
            {editingId ? 'Edit' : 'New'} Entry
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: type + date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-light-copper">Type *</label>
                <Select
                  value={form.intake_type}
                  onValueChange={v => handleField('intake_type', v)}
                >
                  <SelectTrigger className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white focus:border-copper">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[rgba(184,115,51,0.2)]">
                    {INTAKE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-white hover:bg-[rgba(184,115,51,0.1)]">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-light-copper">Date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => handleField('date', e.target.value)}
                  required
                  className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white focus:border-copper"
                />
              </div>
            </div>

            {/* Row 2: project + hours + status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-light-copper">
                  {form.intake_type === 'research' ? 'Domain / Topic' : 'Project'}
                </label>
                <Input
                  type="text"
                  placeholder={form.intake_type === 'research' ? 'e.g. API Migration Research' : 'Project name'}
                  value={form.project}
                  onChange={e => handleField('project', e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white placeholder:text-white/20 focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-light-copper">Hours</label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  placeholder="0.00"
                  value={form.hours}
                  onChange={e => handleField('hours', e.target.value)}
                  className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white placeholder:text-white/20 focus:border-copper"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-light-copper">Status</label>
                <Select value={form.status} onValueChange={v => handleField('status', v)}>
                  <SelectTrigger className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white focus:border-copper">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[rgba(184,115,51,0.2)]">
                    {statuses.map(s => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-[rgba(184,115,51,0.1)]">
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs text-light-copper">Notes</label>
              <Textarea
                placeholder="Context, blockers, next steps..."
                value={form.notes}
                onChange={e => handleField('notes', e.target.value)}
                rows={3}
                className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white placeholder:text-white/20 focus:border-copper resize-none font-mono text-sm"
              />
            </div>

            {/* Research-only: Findings */}
            {form.intake_type === 'research' && (
              <div className="space-y-1">
                <label className="text-xs text-light-copper">
                  Findings
                  <span className="text-white/30 ml-1">(methodology, recommendations, output)</span>
                </label>
                <Textarea
                  placeholder="Research findings, methodology, recommendations..."
                  value={form.findings}
                  onChange={e => handleField('findings', e.target.value)}
                  rows={4}
                  className="bg-[rgba(255,255,255,0.04)] border-[rgba(184,115,51,0.2)] text-white placeholder:text-white/20 focus:border-copper resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={cancelForm}
                className="text-light-copper hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-copper hover:bg-copper/80 text-[#0f0f0f] font-semibold"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Log list ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-light-copper text-sm py-8 text-center">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-light-copper text-sm">
          No entries yet.{' '}
          <button onClick={openNew} className="text-copper hover:underline">Create one →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div
              key={log.id}
              className="
                group flex items-start gap-4 rounded-lg
                border border-[rgba(184,115,51,0.1)]
                bg-[rgba(255,255,255,0.02)]
                hover:border-[rgba(184,115,51,0.3)]
                hover:bg-[rgba(255,255,255,0.04)]
                transition-all p-4
              "
            >
              {/* Type pill */}
              <div className="flex-shrink-0 pt-0.5">
                <span className={`
                  inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider
                  ${INTAKE_TYPE_COLORS[log.intake_type] ?? 'bg-white/5 text-white/50 border border-white/10'}
                `}>
                  {log.intake_type}
                </span>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">
                    {log.project || <span className="text-white/30 italic">No project</span>}
                  </span>
                  <span className={`text-xs ${STATUS_COLORS[log.status] ?? 'text-white/40'}`}>
                    · {STATUS_LABELS[log.status] ?? log.status}
                  </span>
                  {log.hours && (
                    <span className="text-xs text-light-copper">· {parseFloat(log.hours).toFixed(1)}h</span>
                  )}
                </div>
                <div className="text-xs text-white/30">
                  {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                {log.notes && (
                  <p className="text-xs text-white/50 mt-1.5 line-clamp-2 font-mono whitespace-pre-wrap">
                    {log.notes}
                  </p>
                )}
                {log.findings && (
                  <p className="text-xs text-purple-400/70 mt-1 line-clamp-2 font-mono whitespace-pre-wrap">
                    ↳ {log.findings}
                  </p>
                )}
              </div>

              {/* Row actions */}
              <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(log)}
                  className="text-xs text-light-copper hover:text-copper px-2 py-1 rounded hover:bg-[rgba(184,115,51,0.1)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="text-xs text-white/30 hover:text-red-400 px-2 py-1 rounded hover:bg-red-400/5 transition-colors"
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
