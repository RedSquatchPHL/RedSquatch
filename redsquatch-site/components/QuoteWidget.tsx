'use client';

import { useEffect, useState } from 'react';

import { API } from '@/lib/api';

interface QuoteData { text: string; author: string; updated: string; }

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h    = Math.floor(diff / 3600000);
  if (h < 1)  return 'just now';
  if (h < 24) return `${h}h ago`;
  return 'today';
}

export function QuoteWidget() {
  const [data, setData]         = useState<QuoteData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  async function load(force = false) {
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/quick-info/quote${force ? '?force=true' : ''}`, {
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
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(184,115,51,0.8)' }}>
          Quote of the Day
        </span>
        <button
          onClick={() => load(true)}
          disabled={refreshing || loading}
          title="Get new quote"
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
        <div className="flex-1 flex flex-col justify-between gap-3">
          <p
            className="text-base italic leading-relaxed"
            style={{ color: '#d4a373' }}
          >
            &ldquo;{data.text}&rdquo;
          </p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--secondary))' }}>
              — {data.author}
            </p>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              {relTime(data.updated)}
            </span>
          </div>
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
