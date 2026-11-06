'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, ChevronLeft, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { glp1Fetch, dayKey, primaryBtn, ghostBtn, panelStyle, inputStyle } from './shared';

interface SessionRow {
  id: number;
  method_id: string;
  fast_hours: number;
  started_at: string;
  ended_at: string | null;
}

interface PlanRow {
  plan_date: string;   // YYYY-MM-DD
  method_id: string;
  start_time: string;  // HH:MM:SS
  alert_enabled: boolean;
}

interface Draft {
  methodId: string;
  timeMode: 'start' | 'end';
  time: string; // HH:MM
  alert: boolean;
}

const TRF_METHODS = [
  { id: '16_8',  name: '16/8',  fastHours: 16 },
  { id: '14_10', name: '14/10', fastHours: 14 },
  { id: '12_12', name: '12/12', fastHours: 12 },
  { id: '18_6',  name: '18/6',  fastHours: 18 },
  { id: '20_4',  name: '20/4',  fastHours: 20 },
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const muted = { color: 'rgba(var(--rs-accent-rgb),0.6)' } as const;
const DEFAULT_DRAFT: Draft = { methodId: '16_8', timeMode: 'start', time: '20:00', alert: false };

function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function addHours(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const totalMin = ((h * 60 + m + hours * 60) % 1440 + 1440) % 1440;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

function subHours(hhmm: string, hours: number): string {
  return addHours(hhmm, -hours);
}

function formatElapsedShort(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ElapsedTick({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(startedAt).getTime());
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 10_000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <>{formatElapsedShort(elapsed)}</>;
}

export default function FastingCalendar({
  session,
  onStart,
}: {
  session: { methodId: string; startedAt: string } | null;
  onStart: (methodId: string) => Promise<void>;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plans, setPlans] = useState<Record<string, PlanRow>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const days = useMemo(() => {
    const sun = new Date();
    sun.setDate(sun.getDate() - sun.getDay() + weekOffset * 7);
    sun.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const loadWeek = useCallback(async () => {
    const from = dayKey(days[0]);
    const to = dayKey(days[6]);
    try {
      const [pd, sd] = await Promise.all([
        glp1Fetch<{ plans: PlanRow[] }>(`/fasting/plans?from=${from}&to=${to}`),
        glp1Fetch<{ sessions: SessionRow[] }>(`/fasting/history?from=${from}&to=${to}`),
      ]);
      const map: Record<string, PlanRow> = {};
      for (const p of pd.plans) map[p.plan_date.slice(0, 10)] = p;
      setPlans(map);
      setSessions(sd.sessions);
    } catch { /* ignore — empty state shown */ }
  }, [days]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  function openEditor(dateStr: string, existing?: PlanRow) {
    setEditing(dateStr);
    setErr(null);
    if (existing) {
      const hhmm = existing.start_time.slice(0, 5);
      setDraft({ methodId: existing.method_id, timeMode: 'start', time: hhmm, alert: existing.alert_enabled });
    } else {
      setDraft(DEFAULT_DRAFT);
    }
  }

  async function savePlan() {
    if (!editing) return;
    const method = TRF_METHODS.find(m => m.id === draft.methodId)!;
    const startTime = draft.timeMode === 'start' ? draft.time : subHours(draft.time, method.fastHours);
    setSaving(true); setErr(null);
    try {
      await glp1Fetch(`/fasting/plans/${editing}`, {
        method: 'PUT',
        body: JSON.stringify({ method_id: draft.methodId, start_time: startTime, alert_enabled: draft.alert }),
      });
      await loadWeek();
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  async function removePlan() {
    if (!editing) return;
    setSaving(true); setErr(null);
    try {
      await glp1Fetch(`/fasting/plans/${editing}`, { method: 'DELETE' });
      await loadWeek();
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove');
    } finally { setSaving(false); }
  }

  const today = dayKey(new Date());
  const sessionsByDay: Record<string, SessionRow> = {};
  for (const s of sessions) sessionsByDay[dayKey(s.started_at)] = s;

  const method = TRF_METHODS.find(m => m.id === draft.methodId) ?? TRF_METHODS[0];
  const derivedTime = draft.timeMode === 'start'
    ? addHours(draft.time, method.fastHours)
    : subHours(draft.time, method.fastHours);
  const derivedLabel = draft.timeMode === 'start'
    ? `→ ends ${fmt12(derivedTime)}`
    : `→ starts ${fmt12(derivedTime)}`;

  const weekLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${days[0].toLocaleDateString(undefined, opts)} – ${days[6].toLocaleDateString(undefined, opts)}`;
  })();

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => { setWeekOffset(o => o - 1); setEditing(null); }} className="p-1.5 rounded border" style={ghostBtn}>
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold" style={muted}>{weekLabel}</span>
        <button type="button" onClick={() => { setWeekOffset(o => o + 1); setEditing(null); }} className="p-1.5 rounded border" style={ghostBtn}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 7-day grid */}
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[560px]" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {days.map(d => {
            const dk = dayKey(d);
            const isToday = dk === today;
            const isPast = dk < today;
            const plan = plans[dk];
            const sess = sessionsByDay[dk];
            const activeToday = isToday && !!session;
            const isEditing = editing === dk;
            const canEdit = !isPast || isToday;

            let cellBg = 'transparent';
            if (isToday) cellBg = 'rgba(var(--rs-accent-rgb),0.06)';
            if (isEditing) cellBg = 'rgba(var(--rs-accent-rgb),0.1)';

            return (
              <div
                key={dk}
                onClick={() => canEdit && !isEditing && openEditor(dk, plan)}
                className="rounded-md p-2 flex flex-col gap-1 text-center"
                style={{
                  background: cellBg,
                  border: `1px solid ${isEditing ? 'rgba(var(--rs-accent-rgb),0.4)' : 'rgba(var(--rs-edge-rgb),0.15)'}`,
                  cursor: canEdit ? 'pointer' : 'default',
                  minHeight: '100px',
                }}
              >
                {/* Day header */}
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: isToday ? 'var(--rs-accent)' : 'rgba(var(--rs-accent-rgb),0.5)' }}>
                  {DAY_SHORT[d.getDay()]}
                </div>
                <div className="text-xs" style={muted}>{d.getDate()}</div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center gap-1 mt-1">
                  {activeToday && session ? (
                    <>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(var(--rs-accent-rgb),0.15)', color: 'var(--rs-accent)' }}>
                        {session.methodId.replace('_', '/')}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--rs-accent)' }}>
                        <ElapsedTick startedAt={session.startedAt} />
                      </span>
                      <span className="text-xs" style={muted}>active ⏱</span>
                    </>
                  ) : sess ? (
                    <>
                      <CheckCircle2 size={12} style={{ color: 'var(--rs-ok, #4ade80)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--rs-ok, #4ade80)' }}>
                        {sess.method_id.replace('_', '/')}
                      </span>
                      <span className="text-xs" style={muted}>
                        {fmt12(new Date(sess.started_at).toTimeString().slice(0, 5))}
                      </span>
                    </>
                  ) : plan ? (
                    <>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(var(--rs-edge-rgb),0.12)', color: 'var(--rs-accent)' }}>
                        {plan.method_id.replace('_', '/')}
                      </span>
                      <span className="text-xs" style={muted}>{fmt12(plan.start_time.slice(0, 5))}</span>
                      {plan.alert_enabled && <Bell size={10} style={{ color: 'rgba(var(--rs-accent-rgb),0.5)' }} />}
                    </>
                  ) : isPast ? (
                    <span className="text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.25)' }}>—</span>
                  ) : (
                    <span className="text-xs" style={{ color: 'rgba(var(--rs-accent-rgb),0.3)' }}>+ plan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline editor */}
      {editing && (
        <div className="mt-3 rounded-md p-4" style={{ ...panelStyle, border: '1px solid rgba(var(--rs-accent-rgb),0.25)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--rs-accent)' }}>
              {editing === today ? 'Today' : new Date(editing + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <button type="button" onClick={() => setEditing(null)} className="p-1 rounded" style={ghostBtn}><X size={13} /></button>
          </div>

          {/* Method chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TRF_METHODS.map(m => (
              <button key={m.id} type="button"
                onClick={() => setDraft(d => ({ ...d, methodId: m.id }))}
                className="px-2.5 py-1 rounded text-xs font-semibold border transition-colors"
                style={draft.methodId === m.id
                  ? { background: 'var(--rs-btn)', color: 'var(--rs-btn-ink)', borderColor: 'var(--rs-btn)' }
                  : ghostBtn}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* Time input */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <div className="flex gap-3 mb-1.5">
                {(['start', 'end'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="radio" name="timemode" checked={draft.timeMode === mode}
                      onChange={() => setDraft(d => ({ ...d, timeMode: mode }))} />
                    {mode === 'start' ? 'I know my start time' : 'I know my end time'}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={draft.time}
                  onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
                  className="border px-2 py-1.5 text-sm rounded"
                  style={inputStyle}
                />
                <span className="text-xs" style={muted}>{derivedLabel}</span>
              </div>
            </div>

            {/* Alert toggle */}
            <button type="button"
              onClick={() => setDraft(d => ({ ...d, alert: !d.alert }))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-semibold transition-colors"
              style={draft.alert
                ? { background: 'rgba(var(--rs-accent-rgb),0.12)', color: 'var(--rs-accent)', borderColor: 'rgba(var(--rs-accent-rgb),0.3)' }
                : ghostBtn}
            >
              {draft.alert ? <Bell size={12} /> : <BellOff size={12} />}
              {draft.alert ? 'Alert on' : 'Alert off'}
            </button>
          </div>

          {/* Today: "Start Now" if no active session */}
          {editing === today && !session && plans[today] && (
            <button type="button"
              onClick={async () => { await onStart(plans[today].method_id); setEditing(null); }}
              className="mb-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold"
              style={{ background: 'var(--rs-ok, #4ade80)', color: '#000' }}
            >
              Start fast now
            </button>
          )}

          {err && <p className="text-xs mb-2" style={{ color: 'var(--rs-bad)' }}>{err}</p>}

          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={savePlan}
              className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={primaryBtn}
            >
              {saving ? 'Saving…' : 'Save plan'}
            </button>
            {plans[editing] && (
              <button type="button" disabled={saving} onClick={removePlan}
                className="px-3 py-1.5 rounded text-xs font-semibold border disabled:opacity-40"
                style={{ ...ghostBtn, color: 'var(--rs-bad)', borderColor: 'var(--rs-bad)' }}
              >
                Remove
              </button>
            )}
            <button type="button" onClick={() => setEditing(null)}
              className="px-3 py-1.5 rounded text-xs font-semibold border"
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
