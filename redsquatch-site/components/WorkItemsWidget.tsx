'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';

interface Summary {
  active_count:   string;
  archived_count: string;
  inactive_count: string;
  by_type:        Record<string, number> | null;
}

const TYPE_LABEL: Record<string, string> = {
  demand: 'Demand', enhancement: 'Enhancement', story: 'Story',
  scrum_task: 'Task', defect: 'Defect',
};

export function WorkItemsWidget() {
  const [data, setData]       = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`${API}/api/client/work-items/summary`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Failed'))
      .finally(() => setLoading(false));
  }, []);

  const active   = parseInt(data?.active_count   ?? '0', 10);
  const inactive = parseInt(data?.inactive_count ?? '0', 10);

  return (
    <div className="glass-card relative rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(184,115,51,0.8)' }}>
          Work Items
        </span>
        <Link
          href="/dashboard/work-items"
          className="glass-btn text-xs px-2.5 py-1 rounded-lg"
          style={{ textDecoration: 'none' }}
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      ) : error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : data ? (
        <div className="flex flex-col gap-2.5">
          {/* Counts row */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold" style={{ color: '#d4a373' }}>{active}</p>
              <p className="text-xs text-muted-foreground">active</p>
            </div>
            {inactive > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.28)' }}
              >
                <span style={{ color: '#f87171', fontSize: 11, fontWeight: 600 }}>
                  ⚠ {inactive} inactive 60+ days
                </span>
              </div>
            )}
          </div>

          {/* By-type pills */}
          {data.by_type && Object.keys(data.by_type).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.by_type).map(([type, cnt]) => (
                <span
                  key={type}
                  className="text-[10px] font-medium px-2 py-0.5 rounded border"
                  style={{ color: '#b87333', borderColor: 'rgba(184,115,51,0.3)', background: 'rgba(184,115,51,0.07)' }}
                >
                  {TYPE_LABEL[type] ?? type} · {cnt}
                </span>
              ))}
            </div>
          )}

          {active === 0 && (
            <p className="text-muted-foreground text-xs">No active work items.</p>
          )}
        </div>
      ) : null}

      {/* Copper accent */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px rounded"
        style={{ background: 'linear-gradient(90deg, transparent, #b87333 50%, transparent)' }}
      />
    </div>
  );
}
