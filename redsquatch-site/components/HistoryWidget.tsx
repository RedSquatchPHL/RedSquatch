'use client';

import { useEffect, useState } from 'react';

import { API } from '@/lib/api';

interface HistEvent { year: number; text: string; }
interface HistoryData { dateLabel: string; events: HistEvent[]; updated: string; }

export function HistoryWidget() {
  const [data, setData]             = useState<HistoryData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  async function load(force = false) {
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/quick-info/history${force ? '?force=true' : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="glass-card relative rounded-2xl p-5 flex flex-col gap-3 min-h-[160px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(184,115,51,0.8)' }}>
            This Day in History
          </span>
          {data?.dateLabel && (
            <span className="text-[11px] ml-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>· {data.dateLabel}</span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing || loading}
          title="Refresh events"
          className="glass-btn text-xs px-2.5 py-1 rounded-lg"
        >
          {refreshing ? '…' : '↻'}
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-muted-foreground text-sm animate-pulse">Loading…</span>
        </div>
      ) : error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : data ? (
        <div className="flex-1 space-y-3">
          {data.events.map((ev, i) => (
            <div key={i} className="flex gap-3">
              {/* Year pill */}
              <span
                className="shrink-0 text-xs font-bold px-2 py-0.5 rounded border self-start mt-0.5"
                style={{ color: '#b87333', borderColor: '#b8733340', backgroundColor: 'rgba(184,115,51,0.08)' }}
              >
                {ev.year}
              </span>
              <p className="text-sm text-foreground/90 leading-relaxed">{ev.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Copper accent line */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px rounded"
        style={{ background: 'linear-gradient(90deg, transparent, #b87333 50%, transparent)' }}
      />
    </div>
  );
}
