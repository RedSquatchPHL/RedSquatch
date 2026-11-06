'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { glp1Fetch, dayKey, panelStyle } from './shared';

interface FastingSession {
  id: number;
  method_id: string;
  fast_hours: number;
  started_at: string;
  ended_at: string | null;
  notified_at: string | null;
}

const METHOD_NAMES: Record<string, string> = {
  '16_8': '16/8', '14_10': '14/10', '12_12': '12/12', '18_6': '18/6',
  '20_4': '20/4', '5_2': '5:2', 'adf': 'Alt-Day', 'ese': 'Eat-Stop-Eat', 'omad': 'OMAD',
};

const muted = { color: 'rgba(var(--rs-accent-rgb),0.6)' } as const;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function labelDay(key: string): string {
  const today = dayKey(new Date());
  if (key === today) return 'Today';
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  if (key === yesterday) return 'Yesterday';
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function FastBar({ startedAt, endedAt, fastHours }: { startedAt: string; endedAt: string | null; fastHours: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [endedAt]);

  const startMs = new Date(startedAt).getTime();
  const endMs = endedAt ? new Date(endedAt).getTime() : now;
  const targetMs = fastHours * 3_600_000;
  const elapsed = endMs - startMs;
  const pct = Math.min(100, (elapsed / targetMs) * 100);
  const done = elapsed >= targetMs;
  const color = done ? 'var(--rs-ok, #4ade80)' : 'var(--rs-accent)';

  return (
    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--rs-edge-rgb),0.15)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function FastingCalendar() {
  const [sessions, setSessions] = useState<FastingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    glp1Fetch<{ sessions: FastingSession[] }>('/fasting/history')
      .then(d => { setSessions(d.sessions); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return dayKey(d);
  });

  const byDay = new Map<string, FastingSession[]>();
  for (const s of sessions) {
    const k = dayKey(s.started_at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 size={18} className="animate-spin" style={muted} />
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid rgba(var(--rs-edge-rgb),0.2)' }}>
      {days.map((day, idx) => {
        const daySessions = byDay.get(day) ?? [];
        const hasSession = daySessions.length > 0;
        return (
          <div key={day} style={{
            borderBottom: idx < 6 ? '1px solid rgba(var(--rs-edge-rgb),0.1)' : undefined,
            padding: '10px 14px',
          }}>
            <div className="flex items-start gap-3">
              <div className="pt-0.5 shrink-0">
                {hasSession
                  ? <CheckCircle2 size={14} style={{ color: 'var(--rs-ok, #4ade80)' }} />
                  : <Circle size={14} style={muted} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{labelDay(day)}</span>
                  {hasSession && daySessions.map(s => {
                    const startMs = new Date(s.started_at).getTime();
                    const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                    const elapsed = endMs - startMs;
                    const targetMs = Number(s.fast_hours) * 3_600_000;
                    const done = elapsed >= targetMs;
                    const active = !s.ended_at;
                    return (
                      <span key={s.id} className="flex items-center gap-1.5">
                        <span className="text-xs font-mono" style={{ color: 'var(--rs-accent)' }}>
                          {METHOD_NAMES[s.method_id] ?? s.method_id}
                        </span>
                        <span className="text-xs" style={muted}>
                          {fmtTime(s.started_at)}
                          {s.ended_at ? ` → ${fmtTime(s.ended_at)}` : ' → now'}
                        </span>
                        <span className="text-xs font-mono" style={{ color: done ? 'var(--rs-ok, #4ade80)' : active ? 'var(--rs-accent)' : undefined }}>
                          {fmtDuration(elapsed)}
                          {done && !active && ' ✓'}
                          {active && ' ⏱'}
                        </span>
                      </span>
                    );
                  })}
                  {!hasSession && <span className="text-xs" style={muted}>No fast</span>}
                </div>
                {hasSession && daySessions.map(s => (
                  <FastBar key={s.id} startedAt={s.started_at} endedAt={s.ended_at} fastHours={Number(s.fast_hours)} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
