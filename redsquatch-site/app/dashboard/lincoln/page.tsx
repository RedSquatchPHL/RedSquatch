'use client';

import { useEffect, useRef, useState } from 'react';

import { API } from '@/lib/api';

type NextStep = 'email' | 'meeting' | 'analysis' | 'documenting' | 'other';
type Status   = 'pending' | 'in_progress' | 'complete';

interface WorkLog {
  id: number;
  project: string;
  next_steps: NextStep;
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type GroupedLogs = Record<Status, WorkLog[]>;

const NEXT_STEP_LABELS: Record<NextStep, string> = {
  email: 'Email', meeting: 'Meeting', analysis: 'Analysis',
  documenting: 'Documenting', other: 'Other',
};

const NEXT_STEP_COLORS: Record<NextStep, { bg: string; text: string }> = {
  email:        { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd' },
  meeting:      { bg: 'rgba(168,85,247,0.15)',  text: '#d8b4fe' },
  analysis:     { bg: 'rgba(234,179,8,0.15)',   text: '#fde047' },
  documenting:  { bg: 'rgba(34,197,94,0.15)',   text: '#86efac' },
  other:        { bg: 'rgba(184,115,51,0.15)',  text: '#d4a373'  },
};

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'pending',     label: 'To Do'       },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'complete',    label: 'Done'        },
];

function emptyGrouped(): GroupedLogs {
  return { pending: [], in_progress: [], complete: [] };
}

function groupLogs(logs: WorkLog[]): GroupedLogs {
  const out = emptyGrouped();
  for (const log of logs) {
    const col = log.status as Status;
    if (out[col]) out[col].push(log);
    else out.pending.push(log);
  }
  return out;
}

// ─── Intake Form ──────────────────────────────────────────────────────────────

function IntakeForm({ onCreated }: { onCreated: (log: WorkLog) => void }) {
  const [project, setProject]     = useState('');
  const [nextSteps, setNextSteps] = useState<NextStep>('email');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [flash, setFlash]         = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project.trim()) return;
    setSaving(true);
    setFlash(null);
    try {
      const res = await fetch(`${API}/api/client/lincoln/logs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, next_steps: nextSteps, notes, status: 'pending', intake_type: 'work' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const created: WorkLog = await res.json();
      onCreated(created);
      setProject('');
      setNextSteps('email');
      setNotes('');
      setFlash({ ok: true, msg: 'Entry added to To Do.' });
    } catch (err: unknown) {
      setFlash({ ok: false, msg: err instanceof Error ? err.message : 'Error' });
    } finally {
      setSaving(false);
      setTimeout(() => setFlash(null), 3000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Project Name
          </label>
          <input
            type="text"
            value={project}
            onChange={e => setProject(e.target.value)}
            placeholder="e.g. Q3 Budget Review"
            required
            className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#0f0f0f', color: '#d4a373',
              borderColor: 'rgba(184,115,51,0.3)',
            }}
            onFocus={e => (e.target.style.borderColor = '#b87333')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Next Steps
          </label>
          <select
            value={nextSteps}
            onChange={e => setNextSteps(e.target.value as NextStep)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#0f0f0f', color: '#d4a373',
              borderColor: 'rgba(184,115,51,0.3)',
            }}
            onFocus={e => (e.target.style.borderColor = '#b87333')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
          >
            {(Object.keys(NEXT_STEP_LABELS) as NextStep[]).map(k => (
              <option key={k} value={k}>{NEXT_STEP_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Context, blockers, details…"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors resize-none"
          style={{
            backgroundColor: '#0f0f0f', color: '#d4a373',
            borderColor: 'rgba(184,115,51,0.3)',
          }}
          onFocus={e => (e.target.style.borderColor = '#b87333')}
          onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || !project.trim()}
          className="px-5 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40"
          style={{ backgroundColor: '#b87333', color: '#0f0f0f' }}
        >
          {saving ? 'Adding…' : 'Add to Board'}
        </button>
        {flash && (
          <p className="text-sm" style={{ color: flash.ok ? '#86efac' : '#f87171' }}>
            {flash.msg}
          </p>
        )}
      </div>
    </form>
  );
}

// ─── Work Card ────────────────────────────────────────────────────────────────

function WorkCard({
  log, onUpdate, onDelete,
}: {
  log: WorkLog;
  onUpdate: (updated: WorkLog) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [project, setProject]     = useState(log.project);
  const [nextSteps, setNS]        = useState<NextStep>(log.next_steps);
  const [notes, setNotes]         = useState(log.notes ?? '');
  const color                     = NEXT_STEP_COLORS[log.next_steps] ?? NEXT_STEP_COLORS.other;

  async function saveEdit() {
    if (!project.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/client/lincoln/logs/${log.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, next_steps: nextSteps, notes }),
      });
      if (!res.ok) throw new Error();
      onUpdate(await res.json());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    setSaving(true);
    try {
      await fetch(`${API}/api/client/lincoln/logs/${log.id}`, {
        method: 'DELETE', credentials: 'include',
      });
      onDelete(log.id);
    } finally {
      setSaving(false);
      setDeleting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#0f0f0f', color: '#d4a373',
    borderColor: 'rgba(184,115,51,0.3)', borderWidth: 1,
    borderStyle: 'solid', borderRadius: 6,
    padding: '4px 8px', fontSize: 13, width: '100%', outline: 'none',
  };

  return (
    <div className="glass-surface rounded-xl p-3 flex flex-col gap-2">
      {editing ? (
        <>
          <input
            value={project}
            onChange={e => setProject(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#b87333')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
          />
          <select
            value={nextSteps}
            onChange={e => setNS(e.target.value as NextStep)}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#b87333')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
          >
            {(Object.keys(NEXT_STEP_LABELS) as NextStep[]).map(k => (
              <option key={k} value={k}>{NEXT_STEP_LABELS[k]}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder="Notes…"
            onFocus={e => (e.target.style.borderColor = '#b87333')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(184,115,51,0.3)')}
          />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 text-xs py-1 rounded font-semibold disabled:opacity-40"
              style={{ backgroundColor: '#b87333', color: '#0f0f0f' }}
            >
              {saving ? '…' : 'Save'}
            </button>
            <button
              onClick={() => { setEditing(false); setProject(log.project); setNS(log.next_steps); setNotes(log.notes ?? ''); }}
              className="flex-1 text-xs py-1 rounded border border-primary/30 text-muted-foreground hover:bg-primary/10"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight" style={{ color: '#d4a373' }}>
              {log.project}
            </p>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setEditing(true)}
                title="Edit"
                className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
              >
                ✎
              </button>
              {deleting ? (
                <>
                  <button
                    onClick={doDelete}
                    disabled={saving}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/60 text-red-400 border border-red-700/50 hover:bg-red-900 disabled:opacity-40"
                  >
                    {saving ? '…' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setDeleting(false)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 text-muted-foreground hover:bg-primary/10"
                  >
                    No
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDeleting(true)}
                  title="Archive"
                  className="text-[10px] px-1.5 py-0.5 rounded border border-primary/20 text-muted-foreground hover:text-red-400 hover:border-red-700/50 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <span
            className="self-start text-[11px] font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {NEXT_STEP_LABELS[log.next_steps] ?? log.next_steps}
          </span>

          {log.notes && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {log.notes}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status, label, logs, onUpdate, onDelete, onDrop,
}: {
  status: Status; label: string; logs: WorkLog[];
  onUpdate: (log: WorkLog) => void;
  onDelete: (id: number) => void;
  onDrop: (id: number, newStatus: Status) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const dragId = useRef<number | null>(null);

  const HEADER_COLOR: Record<Status, string> = {
    pending:     'rgba(100,116,139,0.3)',
    in_progress: 'rgba(184,115,51,0.3)',
    complete:    'rgba(34,197,94,0.2)',
  };

  return (
    <div
      className="glass-surface flex flex-col gap-3 rounded-xl p-3 min-h-[200px] transition-all"
      style={{
        backgroundColor: dragOver ? 'rgba(184,115,51,0.10)' : undefined,
        borderColor: dragOver ? 'rgba(184,115,51,0.5)' : undefined,
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const id = parseInt(e.dataTransfer.getData('logId'), 10);
        if (!isNaN(id)) onDrop(id, status);
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-2 py-1 rounded"
        style={{ backgroundColor: HEADER_COLOR[status] }}
      >
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">{label}</span>
        <span className="text-xs text-muted-foreground">{logs.length}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {logs.map(log => (
          <div
            key={log.id}
            draggable
            onDragStart={e => {
              dragId.current = log.id;
              e.dataTransfer.setData('logId', String(log.id));
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <WorkCard log={log} onUpdate={onUpdate} onDelete={onDelete} />
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-xs text-muted-foreground/40 text-center mt-6">Drop cards here</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LincolnPage() {
  const [grouped, setGrouped] = useState<GroupedLogs>(emptyGrouped());
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/lincoln/logs`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGrouped(groupLogs(data.logs ?? []));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleCreated(log: WorkLog) {
    setGrouped(prev => ({ ...prev, pending: [log, ...prev.pending] }));
  }

  function handleUpdate(updated: WorkLog) {
    setGrouped(prev => {
      const next = { ...emptyGrouped(), pending: [...prev.pending], in_progress: [...prev.in_progress], complete: [...prev.complete] };
      for (const col of COLUMNS) {
        next[col.status] = next[col.status].map(l => l.id === updated.id ? updated : l);
      }
      return next;
    });
  }

  function handleDelete(id: number) {
    setGrouped(prev => ({
      pending:     prev.pending.filter(l => l.id !== id),
      in_progress: prev.in_progress.filter(l => l.id !== id),
      complete:    prev.complete.filter(l => l.id !== id),
    }));
  }

  async function handleDrop(id: number, newStatus: Status) {
    let currentStatus: Status | null = null;
    let logData: WorkLog | null = null;
    for (const col of COLUMNS) {
      const found = grouped[col.status].find(l => l.id === id);
      if (found) { currentStatus = col.status; logData = found; break; }
    }
    if (!currentStatus || !logData || currentStatus === newStatus) return;

    // Optimistic update
    const removed = { pending: [...grouped.pending], in_progress: [...grouped.in_progress], complete: [...grouped.complete] };
    removed[currentStatus] = removed[currentStatus].filter(l => l.id !== id);
    removed[newStatus]     = [{ ...logData, status: newStatus }, ...removed[newStatus]];
    setGrouped(removed);

    try {
      const res = await fetch(`${API}/api/client/lincoln/logs/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated: WorkLog = await res.json();
      setGrouped(prev => ({
        ...prev,
        [newStatus]: prev[newStatus].map(l => l.id === id ? updated : l),
      }));
    } catch {
      load();
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="glass-surface rounded-2xl px-6 py-4">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Lincoln Work Tracker
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Log work items and track them through your workflow.
        </p>
      </div>

      {/* Intake Form */}
      <div className="glass-surface rounded-xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#b87333' }}>
          New Work Entry
        </h2>
        <IntakeForm onCreated={handleCreated} />
      </div>

      {/* Kanban */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#b87333' }}>
          Board
        </h2>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-primary/10 bg-card h-48 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                logs={grouped[col.status]}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
