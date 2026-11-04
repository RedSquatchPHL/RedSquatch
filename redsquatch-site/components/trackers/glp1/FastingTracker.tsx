'use client';

import { useEffect, useState } from 'react';
import { Timer, Square } from 'lucide-react';
import { primaryBtn, ghostBtn, panelStyle } from './shared';

interface FastingMethod {
  id: string;
  name: string;
  protocol: string;
  fastHours: number;
}

const DAILY_TRF: FastingMethod[] = [
  { id: '16_8',  name: '16/8 Leangains',    protocol: 'Fast 16h · eat 8h (e.g. 12 PM–8 PM) — most popular',  fastHours: 16 },
  { id: '14_10', name: '14/10',              protocol: 'Fast 14h · eat 10h — gentler entry point',              fastHours: 14 },
  { id: '12_12', name: '12/12',              protocol: 'Fast 12h · eat 12h — beginner-friendly',                fastHours: 12 },
  { id: '18_6',  name: '18/6',               protocol: 'Fast 18h · eat 6h — condensed eating window',           fastHours: 18 },
  { id: '20_4',  name: '20/4 Warrior Diet',  protocol: 'Fast 20h · eat 4h (evening) — full daily calories',     fastHours: 20 },
];

const WEEKLY: FastingMethod[] = [
  { id: '5_2',   name: '5:2 Diet',           protocol: '5 normal days · 2 fasting days (~500–600 cal)',         fastHours: 24 },
  { id: 'adf',   name: 'Alternate-Day',       protocol: 'Fast every other day (0–500 cal on fast days)',         fastHours: 24 },
  { id: 'ese',   name: 'Eat-Stop-Eat',        protocol: '24-hour fast 1–2× per week (dinner to dinner)',         fastHours: 24 },
  { id: 'omad',  name: 'OMAD',                protocol: '23:1 · entire day\'s calories in one sitting',          fastHours: 23 },
];

const LS_KEY = 'rs_fasting_session';

interface FastingSession { methodId: string; startedAt: string }

function loadSession(): FastingSession | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
}
function saveSession(s: FastingSession | null) {
  try { if (s) localStorage.setItem(LS_KEY, JSON.stringify(s)); else localStorage.removeItem(LS_KEY); } catch {}
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const muted = { color: 'rgba(var(--rs-accent-rgb),0.6)' } as const;

function FastingRow({ method, session, onStart, onStop }: {
  method: FastingMethod;
  session: FastingSession | null;
  onStart: (id: string) => void;
  onStop: () => void;
}) {
  const isActive = session?.methodId === method.id;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive || !session) { setElapsed(0); return; }
    const startMs = new Date(session.startedAt).getTime();
    const update = () => setElapsed(Date.now() - startMs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isActive, session]);

  const targetMs = method.fastHours * 3_600_000;
  const pct = isActive ? Math.min(100, (elapsed / targetMs) * 100) : 0;
  const done = isActive && elapsed >= targetMs;

  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: isActive ? 'var(--rs-accent)' : undefined }}>{method.name}</div>
          <div className="text-xs mt-0.5" style={muted}>{method.protocol}</div>
        </div>
        {isActive && (
          <span className="text-sm font-mono shrink-0" style={{ color: done ? 'var(--rs-ok, #4ade80)' : 'var(--rs-accent)' }}>
            {formatElapsed(elapsed)}
          </span>
        )}
        {isActive ? (
          <button type="button" onClick={onStop}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border"
            style={ghostBtn}>
            <Square size={11} /> Stop
          </button>
        ) : (
          <button type="button" onClick={() => onStart(method.id)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded"
            style={primaryBtn}>
            <Timer size={11} /> Start
          </button>
        )}
      </div>
      {isActive && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--rs-edge-rgb),0.15)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: done ? 'var(--rs-ok, #4ade80)' : 'var(--rs-accent)' }} />
        </div>
      )}
    </div>
  );
}

export default function FastingTracker() {
  const [session, setSession] = useState<FastingSession | null>(null);

  useEffect(() => { setSession(loadSession()); }, []);

  function start(methodId: string) {
    const s: FastingSession = { methodId, startedAt: new Date().toISOString() };
    setSession(s);
    saveSession(s);
  }

  function stop() {
    setSession(null);
    saveSession(null);
  }

  const activeMethod = [...DAILY_TRF, ...WEEKLY].find(m => m.id === session?.methodId);

  return (
    <div>
      {session && activeMethod && (
        <div className="rounded-md px-3 py-2 mb-4 text-xs" style={{ ...panelStyle, color: 'var(--rs-accent)', borderLeft: '2px solid var(--rs-accent)' }}>
          Active: <strong>{activeMethod.name}</strong> — started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={muted}>Daily Time-Restricted</div>
      <div className="rounded-md px-3" style={panelStyle}>
        {DAILY_TRF.map(m => (
          <FastingRow key={m.id} method={m} session={session} onStart={start} onStop={stop} />
        ))}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider mt-4 mb-2" style={muted}>Weekly &amp; Alternate-Day</div>
      <div className="rounded-md px-3" style={panelStyle}>
        {WEEKLY.map(m => (
          <FastingRow key={m.id} method={m} session={session} onStart={start} onStop={stop} />
        ))}
      </div>

      <p className="text-xs mt-3" style={muted}>Timer persists across page refreshes and is stored locally on this device.</p>
    </div>
  );
}
