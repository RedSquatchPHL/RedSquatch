'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X, Timer } from 'lucide-react';
import { glp1Fetch } from '@/components/trackers/glp1/shared';

function formatCountdown(ms: number) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function HealthCountdown() {
  const [target, setTarget]       = useState<Date | null>(null);
  const [label, setLabel]         = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [rawProfile, setRawProfile] = useState<Record<string, unknown>>({});
  const [loaded, setLoaded]       = useState(false);
  const [editing, setEditing]     = useState(false);
  const [editDate, setEditDate]   = useState('');
  const [editTime, setEditTime]   = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function loadProfile() {
    return glp1Fetch<Record<string, unknown>>('/profile').then(p => {
      setRawProfile(p);
      const ct = p.countdown_target as string | null | undefined;
      const cl = (p.countdown_label as string | null | undefined) ?? null;
      setLabel(cl);
      setEditLabel(cl ?? '');
      if (ct) {
        const d = new Date(ct);
        setTarget(d);
        const pad2 = (n: number) => String(n).padStart(2, '0');
        setEditDate(`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`);
        setEditTime(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
      } else {
        setTarget(null);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    if (!target) { setRemaining(null); return; }
    const update = () => setRemaining(formatCountdown(target.getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (!editing) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditing(false);
        setErr(null);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editing]);

  async function save() {
    if (!editDate) { setErr('Pick a date.'); return; }
    setSaving(true); setErr(null);
    try {
      await glp1Fetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          height_in:        toNum(rawProfile.height_in),
          target_weight_lb: toNum(rawProfile.target_weight_lb),
          hydration_goal_oz: toNum(rawProfile.hydration_goal_oz) ?? 64,
          protein_goal_g:   toNum(rawProfile.protein_goal_g),
          countdown_target: editTime ? `${editDate}T${editTime}:00` : `${editDate}T00:00:00`,
          countdown_label:  editLabel.trim() || null,
        }),
      });
      await loadProfile();
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true); setErr(null);
    try {
      await glp1Fetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          height_in:        toNum(rawProfile.height_in),
          target_weight_lb: toNum(rawProfile.target_weight_lb),
          hydration_goal_oz: toNum(rawProfile.hydration_goal_oz) ?? 64,
          protein_goal_g:   toNum(rawProfile.protein_goal_g),
          countdown_target: null,
          countdown_label:  null,
        }),
      });
      setTarget(null); setRemaining(null); setEditDate(''); setEditTime(''); setEditLabel(''); setLabel(null);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to clear.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  const accent      = 'var(--rs-accent)';
  const accentRgb   = 'var(--rs-accent-rgb)';
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: `1px solid rgba(${accentRgb},0.3)`,
    borderRadius: 6,
    color: accent,
    fontSize: 12,
    padding: '4px 6px',
  };
  const popStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 70,
    background: 'color-mix(in srgb, var(--stone-0) 97%, black)',
    border: `1px solid rgba(${accentRgb},0.35)`,
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 260,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  };

  return (
    <div className="relative flex flex-col items-center" ref={popoverRef}>
      {/* Label line */}
      {label && (
        <div className="text-xs mb-0.5 opacity-60 font-mono" style={{ color: accent }}>
          {label}
        </div>
      )}

      {/* Trigger row */}
      {target && remaining ? (
        <button
          onClick={() => { setEditing(e => !e); setErr(null); }}
          className="flex items-center gap-1.5 group"
          title="Edit timer"
        >
          <span className="font-mono text-sm flex items-center gap-1" style={{ color: accent, textShadow: `0 0 10px rgba(${accentRgb},0.3)` }}>
            {remaining.d > 0 && <><strong>{remaining.d}</strong><span className="text-xs opacity-60">d</span><span className="opacity-30 mx-0.5">·</span></>}
            <strong>{pad(remaining.h)}</strong><span className="text-xs opacity-60">h</span>
            <span className="opacity-30">:</span>
            <strong>{pad(remaining.m)}</strong><span className="text-xs opacity-60">m</span>
            <span className="opacity-30">:</span>
            <strong>{pad(remaining.s)}</strong><span className="text-xs opacity-60">s</span>
          </span>
          <Pencil size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: accent }} />
        </button>
      ) : target && !remaining ? (
        <button onClick={() => { setEditing(e => !e); setErr(null); }} className="flex items-center gap-1 text-xs font-mono" style={{ color: `rgba(${accentRgb},0.6)` }}>
          Goal reached! <Pencil size={11} />
        </button>
      ) : (
        <button
          onClick={() => { setEditing(e => !e); setErr(null); }}
          className="flex items-center gap-1.5 text-xs font-mono opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: accent }}
        >
          <Timer size={12} /> Set health timer
        </button>
      )}

      {/* Inline popover */}
      {editing && (
        <div style={popStyle} onClick={e => e.stopPropagation()}>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: `rgba(${accentRgb},0.6)` }}>
            Health Countdown Timer
          </div>
          <input
            type="text"
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            placeholder="What is this timer for? (optional)"
            maxLength={120}
            disabled={saving}
            style={{ ...inputStyle, width: '100%' }}
          />
          <div className="flex gap-2">
            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} disabled={saving} style={{ ...inputStyle, flex: 1 }} />
            <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} disabled={saving} style={{ ...inputStyle, width: 90 }} />
          </div>
          {err && <p className="text-xs" style={{ color: 'var(--rs-bad, #f87171)' }}>{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={save} disabled={saving || !editDate}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
              style={{ background: `rgba(${accentRgb},0.2)`, border: `1px solid rgba(${accentRgb},0.5)`, color: accent }}
            >
              <Check size={12} /> {saving ? 'Saving…' : 'Set'}
            </button>
            {target && (
              <button
                onClick={clear} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                style={{ border: `1px solid rgba(${accentRgb},0.2)`, color: `rgba(${accentRgb},0.6)` }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
