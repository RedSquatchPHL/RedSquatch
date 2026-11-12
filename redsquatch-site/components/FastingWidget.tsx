'use client';

import { useEffect, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { glp1Fetch } from '@/components/trackers/glp1/shared';

const LS_KEY = 'rs_fasting_session';

interface FastingSession { methodId: string; startedAt: string }

type SyncState = 'checking' | 'ok' | 'mismatch';

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

function readLocal(): FastingSession | null {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
}

function sessionsMatch(a: FastingSession | null, b: FastingSession | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.methodId !== b.methodId) return false;
  // Allow up to 60s of clock skew between localStorage and server timestamps
  return Math.abs(new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()) < 60_000;
}

export default function FastingWidget({ onOpen }: { onOpen?: () => void }) {
  const [session, setSession] = useState<FastingSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sync, setSync] = useState<SyncState>('checking');

  function reloadLocal() {
    setSession(readLocal());
  }

  // Server sync check: fetch authoritative session and compare with localStorage
  async function checkSync() {
    setSync('checking');
    try {
      const data = await glp1Fetch<{ session: { method_id: string; started_at: string } | null }>('/fasting/current');
      const serverSession: FastingSession | null = data.session
        ? { methodId: data.session.method_id, startedAt: data.session.started_at }
        : null;
      const localSession = readLocal();

      if (sessionsMatch(serverSession, localSession)) {
        setSync('ok');
      } else {
        // Auto-sync: server is authoritative, write its state to localStorage
        if (serverSession) localStorage.setItem(LS_KEY, JSON.stringify(serverSession));
        else localStorage.removeItem(LS_KEY);
        setSession(serverSession);
        setSync('ok');
      }
    } catch {
      // Network unavailable — can't verify, stay on whatever localStorage says
      setSync('ok');
    }
  }

  useEffect(() => {
    setSession(readLocal());
    checkSync();

    function onUpdate() { reloadLocal(); }
    function onStorage(e: StorageEvent) { if (e.key === LS_KEY) onUpdate(); }

    window.addEventListener('rs-fasting-updated', onUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('rs-fasting-updated', onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {sync === 'checking' && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'rgba(var(--rs-accent-rgb),0.5)' }}
            title="Checking sync…"
          />
        )}
        {sync === 'mismatch' && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--rs-warn, #f59e0b)' }}
            title="Timer out of sync with server"
          />
        )}
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
