'use client';

import { useEffect, useRef, useState } from 'react';
import { Timer, Square, ChevronDown, ChevronUp, Bell, BellOff, Clock } from 'lucide-react';
import { glp1Fetch, primaryBtn, ghostBtn, panelStyle, inputStyle } from './shared';
import FastingCalendar from './FastingCalendar';

interface FastingMethod {
  id: string;
  name: string;
  protocol: string;
  fastHours: number;
}

const DAILY_TRF: FastingMethod[] = [
  { id: '16_8',  name: '16/8 Leangains',    protocol: 'Fast 16h · eat 8h (e.g. 12 PM–8 PM) — most popular',  fastHours: 16 },
  { id: '14_10', name: '14/10',              protocol: 'Fast 14h · eat 10h — gentler entry point',              fastHours: 14 },
  { id: '18_6',  name: '18/6',               protocol: 'Fast 18h · eat 6h — condensed eating window',           fastHours: 18 },
];

const WEEKLY: FastingMethod[] = [
  { id: '5_2',   name: '5:2 Diet',           protocol: '5 normal days · 2 fasting days (~500–600 cal)',         fastHours: 24 },
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nowLocalDTInput(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

function FastingRow({ method, session, onStart, onStop }: {
  method: FastingMethod;
  session: FastingSession | null;
  onStart: (id: string, startedAt?: string) => void;
  onStop: () => void;
}) {
  const isActive = session?.methodId === method.id;
  const [elapsed, setElapsed] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customTime, setCustomTime] = useState('');

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

  function openTimePicker() {
    setCustomTime(nowLocalDTInput());
    setShowTimePicker(true);
  }

  function startCustom() {
    onStart(method.id, new Date(customTime).toISOString());
    setShowTimePicker(false);
  }

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
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => onStart(method.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded"
              style={primaryBtn}>
              <Timer size={11} /> Start
            </button>
            <button type="button" onClick={openTimePicker} title="Start at custom time"
              className="p-1.5 rounded border"
              style={ghostBtn}>
              <Clock size={11} />
            </button>
          </div>
        )}
      </div>
      {isActive && (
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--rs-edge-rgb),0.15)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: done ? 'var(--rs-ok, #4ade80)' : 'var(--rs-accent)' }} />
        </div>
      )}
      {showTimePicker && (
        <div className="mt-2 flex flex-wrap items-center gap-2 p-2 rounded" style={{ background: 'rgba(var(--rs-edge-rgb),0.08)' }}>
          <span className="text-xs" style={muted}>Started at:</span>
          <input
            type="datetime-local"
            value={customTime}
            max={nowLocalDTInput()}
            onChange={e => setCustomTime(e.target.value)}
            className="border px-2 py-1 text-xs rounded"
            style={inputStyle}
          />
          <button type="button" onClick={startCustom}
            className="px-2.5 py-1 text-xs font-semibold rounded"
            style={primaryBtn}>
            Start
          </button>
          <button type="button" onClick={() => setShowTimePicker(false)}
            className="px-2 py-1 text-xs rounded border"
            style={ghostBtn}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

interface ScheduleDraft {
  enabled: boolean;
  hour: string;
  min: string;
  fastDays: number[];
}

function SectionToggle({ label, open, onToggle, icon: Icon }: {
  label: string; open: boolean; onToggle: () => void; icon?: typeof Bell;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-md"
      style={{ ...panelStyle, color: 'rgba(var(--rs-accent-rgb),0.7)' }}
    >
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </button>
  );
}

export default function FastingTracker() {
  const [session, setSession] = useState<FastingSession | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Schedule state
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    enabled: false, hour: '20', min: '00', fastDays: [],
  });
  const [scheduleErr, setScheduleErr] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    glp1Fetch<{ session: { method_id: string; started_at: string } | null }>('/fasting/current')
      .then(data => {
        if (data.session) {
          const s: FastingSession = { methodId: data.session.method_id, startedAt: data.session.started_at };
          setSession(s);
          saveSession(s);
        } else {
          setSession(loadSession());
        }
      })
      .catch(() => setSession(loadSession()));

    glp1Fetch<{ enabled: boolean; reminder_hour: number; reminder_min: number; fast_days: number[] | null }>('/fasting/schedule')
      .then(d => {
        setScheduleDraft({
          enabled: d.enabled,
          hour: String(d.reminder_hour).padStart(2, '0'),
          min: String(d.reminder_min).padStart(2, '0'),
          fastDays: d.fast_days ?? [],
        });
      })
      .catch(() => {});
  }, []);

  async function start(methodId: string, startedAt?: string) {
    try {
      const body: Record<string, string> = { method_id: methodId };
      if (startedAt) body.started_at = startedAt;
      const data = await glp1Fetch<{ session: { method_id: string; started_at: string } }>('/fasting/start', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const s: FastingSession = { methodId: data.session.method_id, startedAt: data.session.started_at };
      setSession(s);
      saveSession(s);
    } catch {
      const s: FastingSession = { methodId, startedAt: startedAt ?? new Date().toISOString() };
      setSession(s);
      saveSession(s);
    }
  }

  async function stop() {
    try { await glp1Fetch('/fasting/stop', { method: 'POST' }); } catch { /* ignore */ }
    setSession(null);
    saveSession(null);
  }

  async function saveSchedule() {
    const h = Number(scheduleDraft.hour);
    const m = Number(scheduleDraft.min);
    if (!Number.isFinite(h) || h < 0 || h > 23) { setScheduleErr('Hour must be 0–23'); return; }
    if (!Number.isFinite(m) || m < 0 || m > 59) { setScheduleErr('Minute must be 0–59'); return; }
    setScheduleSaving(true);
    setScheduleErr(null);
    try {
      await glp1Fetch('/fasting/schedule', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: scheduleDraft.enabled,
          reminder_hour: h,
          reminder_min: m,
          fast_days: scheduleDraft.fastDays.length > 0 ? scheduleDraft.fastDays : null,
        }),
      });
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 2000);
    } catch (e) {
      setScheduleErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setScheduleSaving(false);
    }
  }

  function toggleDay(day: number) {
    setScheduleDraft(d => ({
      ...d,
      fastDays: d.fastDays.includes(day) ? d.fastDays.filter(x => x !== day) : [...d.fastDays, day].sort(),
    }));
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

      {/* Week Calendar */}
      <div className="mt-5">
        <SectionToggle label="Week Planner" open={showHistory} onToggle={() => setShowHistory(v => !v)} />
        {showHistory && (
          <div className="mt-2">
            <FastingCalendar session={session} onStart={start} />
          </div>
        )}
      </div>

      {/* Reminder Settings */}
      <div className="mt-3">
        <SectionToggle
          label="Reminder Settings"
          open={showReminder}
          onToggle={() => setShowReminder(v => !v)}
          icon={scheduleDraft.enabled ? Bell : BellOff}
        />
        {showReminder && (
          <div className="mt-2 rounded-md p-4" style={panelStyle}>
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={scheduleDraft.enabled}
                  onChange={e => setScheduleDraft(d => ({ ...d, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                Send a Pushover reminder when it's time to start my fast
              </label>
            </div>

            <div className="flex items-end gap-3 mb-4 flex-wrap">
              <div>
                <div className="text-xs mb-1" style={muted}>Reminder time</div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0} max={23}
                    value={scheduleDraft.hour}
                    onChange={e => setScheduleDraft(d => ({ ...d, hour: e.target.value }))}
                    disabled={!scheduleDraft.enabled}
                    className="w-14 border px-2 py-1.5 text-sm rounded text-center"
                    style={inputStyle}
                  />
                  <span className="text-sm font-bold" style={muted}>:</span>
                  <input
                    type="number"
                    min={0} max={59}
                    value={scheduleDraft.min}
                    onChange={e => setScheduleDraft(d => ({ ...d, min: e.target.value }))}
                    disabled={!scheduleDraft.enabled}
                    className="w-14 border px-2 py-1.5 text-sm rounded text-center"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs mb-2" style={muted}>Remind on these days (leave all unchecked for every day)</div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, idx) => {
                  const active = scheduleDraft.fastDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!scheduleDraft.enabled}
                      onClick={() => toggleDay(idx)}
                      className="px-2.5 py-1 rounded text-xs font-semibold border transition-colors disabled:opacity-30"
                      style={active
                        ? { background: 'var(--rs-btn)', color: 'var(--rs-btn-ink)', borderColor: 'var(--rs-btn)' }
                        : ghostBtn}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {scheduleErr && <p className="text-xs mb-2" style={{ color: 'var(--rs-bad)' }}>{scheduleErr}</p>}

            <button
              type="button"
              onClick={saveSchedule}
              disabled={scheduleSaving}
              className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={primaryBtn}
            >
              {scheduleSaved ? 'Saved ✓' : scheduleSaving ? 'Saving…' : 'Save reminder'}
            </button>

            {scheduleDraft.enabled && (
              <p className="text-xs mt-2" style={muted}>
                Reminder fires via Pushover at {scheduleDraft.hour}:{scheduleDraft.min.padStart(2,'0')}
                {scheduleDraft.fastDays.length > 0
                  ? ` on ${scheduleDraft.fastDays.map(d => DAY_LABELS[d]).join(', ')}`
                  : ' every day'}.
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs mt-3" style={muted}>Fasting session is synced to the server so notifications fire even when this tab is closed.</p>
    </div>
  );
}
