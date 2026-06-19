'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@/components/TasksBoard';

import { API } from '@/lib/api';

interface Log {
  id: number;
  task_id: number;
  task_title: string;
  completed_at: string;
  notes: string | null;
}

interface Props {
  task: Task | null;
  onClose: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const wks = Math.floor(days / 7);
  if (wks < 8)   return `${wks} week${wks !== 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MaintenanceDrawer({ task, onClose }: Props) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!task) return;
    setLoading(true);
    fetch(`${API}/api/client/maintenance-logs?task_id=${task.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [task]);

  async function logCompletion() {
    if (!task) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/api/client/maintenance-logs`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, notes: note.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(prev => [{ ...data.log, task_title: task.title }, ...prev]);
        setNote('');
      }
    } catch { /* silent */ } finally {
      setAdding(false);
    }
  }

  if (!task) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col drawer-enter" style={{ background: 'rgba(8,8,8,0.80)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderLeft: '1px solid rgba(184,115,51,0.25)' }}>
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'hsl(var(--secondary))' }}>
              Maintenance Log
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Log completion */}
        <div className="p-4 border-b border-primary/10 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Log a completion</p>
          <textarea
            placeholder="Optional notes…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-primary/30 px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={logCompletion}
            disabled={adding}
            className="w-full text-sm py-1.5 rounded ctx-btn-active hover:opacity-90 disabled:opacity-50"
          >
            {adding ? 'Logging…' : 'Mark Completed'}
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!loading && logs.length === 0 && (
            <p className="text-muted-foreground text-sm">No completions logged yet.</p>
          )}
          {logs.map((log, i) => (
            <div key={log.id} className="relative flex gap-3">
              {/* Timeline line */}
              {i < logs.length - 1 && (
                <div className="absolute left-[9px] top-5 bottom-0 w-px" style={{ backgroundColor: 'var(--ctx-accent)', opacity: 0.3 }} />
              )}
              {/* Dot */}
              <div
                className="mt-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 z-10"
                style={{ borderColor: 'var(--ctx-accent)', backgroundColor: 'var(--ctx-accent-dim)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ctx-accent)' }} />
              </div>
              <div className="flex-1 pb-3">
                <p className="text-xs font-medium ctx-text">{relativeTime(log.completed_at)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(log.completed_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
                {log.notes && <p className="text-xs text-foreground mt-1 italic">{log.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
