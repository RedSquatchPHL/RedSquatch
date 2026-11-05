'use client';

import { useEffect, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

const LS_KEY = 'rs_fasting_session';

interface FastingSession { methodId: string; startedAt: string }

const ALL_METHODS: Record<string, { name: string; fastHours: number }> = {
  '16_8':  { name: '16/8',           fastHours: 16 },
  '14_10': { name: '14/10',          fastHours: 14 },
  '12_12': { name: '12/12',          fastHours: 12 },
  '18_6':  { name: '18/6',           fastHours: 18 },
  '20_4':  { name: '20/4',           fastHours: 20 },
  '5_2':   { name: '5:2',            fastHours: 24 },
  'adf':   { name: 'Alt-Day',        fastHours: 24 },
  'ese':   { name: 'Eat-Stop-Eat',   fastHours: 24 },
  'omad':  { name: 'OMAD',           fastHours: 23 },
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function FastingWidget({ onOpen }: { onOpen?: () => void }) {
  const [session, setSession] = useState<FastingSession | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    try { setSession(JSON.parse(localStorage.getItem(LS_KEY) ?? 'null')); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!session) { setElapsed(0); return; }
    const startMs = new Date(session.startedAt).getTime();
    const update = () => setElapsed(Date.now() - startMs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session]);

  const accent    = 'var(--rs-accent)';
  const accentRgb = 'var(--rs-accent-rgb)';
  const method    = session ? ALL_METHODS[session.methodId] : null;
  const targetMs  = method ? method.fastHours * 3_600_000 : 0;
  const pct       = method ? Math.min(100, (elapsed / targetMs) * 100) : 0;
  const done      = session && elapsed >= targetMs;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col items-center gap-0.5 group"
      title="Open Fasting Tracker"
      style={{ cursor: onOpen ? 'pointer' : 'default' }}
    >
      <div className="text-xs font-mono opacity-60 flex items-center gap-1" style={{ color: accent }}>
        <UtensilsCrossed size={10} />
        Fasting Tracker
      </div>

      {session && method ? (
        <>
          <span
            className="font-mono text-sm"
            style={{ color: done ? 'var(--rs-ok, #4ade80)' : accent, textShadow: `0 0 10px rgba(${accentRgb},0.3)` }}
          >
            {formatElapsed(elapsed)}
          </span>
          <div className="w-20 h-1 rounded-full overflow-hidden mt-0.5" style={{ background: `rgba(${accentRgb},0.15)` }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: done ? 'var(--rs-ok, #4ade80)' : accent }}
            />
          </div>
          <div className="text-xs opacity-50" style={{ color: accent }}>{method.name}</div>
        </>
      ) : (
        <span className="text-xs font-mono opacity-40" style={{ color: accent }}>idle</span>
      )}
    </button>
  );
}
