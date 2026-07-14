'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Sunset, Briefcase, X, Wrench, LogOut } from 'lucide-react';
import { useHomeSquatchGate } from './HomeSquatchGate';
import { logout } from '@/lib/api';
import { TOOLS_SUBMENU, type MenuLeaf } from '@/lib/menuConfig';

// 5-minute increments, matching the requested "wrap up between 4 and 6" window.
const INCREMENTS = [5, 10, 15, 20, 25, 30];

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Global, bottom-left, low-key gear-badge trigger — deliberately styled like a
// settings/profile icon rather than a labeled "Clock Out" pill, so it doesn't compete
// with the per-page Settings buttons that already exist on /dashboard and
// /hs/dashboard (those are unrelated and untouched). Doubles as the profile/avatar
// menu: Clock In/Out, Tools (icon-only submenu, config in lib/menuConfig.ts),
// Settings and Log out all live in the one panel rather than a second bottom-left
// widget. Reachable from every route via GlobalEffects.tsx. A small dot on the
// badge signals a pending scheduled clock-out even while the panel is closed.
export default function ClockGateMenu() {
  const { mode, clockoutTarget, clockOutNow, scheduleClockOut, cancelClockOut, clockInNow } = useHomeSquatchGate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [remaining, setRemaining] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setToolsOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    if (clockoutTarget == null) return;
    const tick = () => setRemaining(formatRemaining(clockoutTarget - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [clockoutTarget]);

  function closeAll() {
    setOpen(false);
    setToolsOpen(false);
  }

  function openLeaf(item: MenuLeaf) {
    if (item.type === 'external') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(item.path);
    }
    closeAll();
  }

  function handleLogout() {
    logout();
    router.push('/logout');
    closeAll();
  }

  // Reads the same --copper-*/--border-copper tokens every other command-center
  // component uses (cenote-tokens.css, overridden per-phase by homesquatch-theme.css
  // and [data-theme="day"]), instead of the hardcoded hex this file used to have —
  // so the menu recolors along with Work Mode / Downtime phases automatically.
  const pillBase: React.CSSProperties = {
    background: 'rgba(10,10,10,0.50)',
    backdropFilter: 'blur(24px) saturate(150%)',
    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
    border: 'var(--border-copper)',
    borderRadius: 10,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.45)',
  };

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 7,
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: active ? 'var(--copper-2)' : 'rgba(255,255,255,0.6)',
    background: active ? 'rgba(var(--copper-glow-rgb), 0.14)' : 'transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  });

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    padding: 0,
    border: '1px solid rgba(var(--copper-glow-rgb), 0.18)',
    borderRadius: 7,
    color: 'var(--copper-2)',
    background: 'transparent',
    cursor: 'pointer',
  };

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 14, left: 14, zIndex: 60 }}>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            ...pillBase,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 4,
            padding: 8,
            minWidth: 180,
          }}
        >
          {mode === 'work' ? (
            clockoutTarget != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 11, fontWeight: 500, color: 'var(--copper-2)' }}>
                <Sunset style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ fontVariantNumeric: 'tabular-nums', flex: 1 }}>Clocking out in {remaining}</span>
                <button
                  onClick={cancelClockOut}
                  title="Cancel"
                  style={{ display: 'flex', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 2 }}
                >
                  <X style={{ width: 11, height: 11 }} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { clockOutNow(); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    border: '1px solid rgba(var(--copper-glow-rgb), 0.3)',
                    borderRadius: 7,
                    padding: '6px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--copper-2)',
                    background: 'rgba(var(--copper-glow-rgb), 0.14)',
                    cursor: 'pointer',
                  }}
                >
                  <Sunset style={{ width: 12, height: 12 }} />
                  Clock out now
                </button>

                <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', margin: '4px 2px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  or in…
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {INCREMENTS.map(min => (
                    <button
                      key={min}
                      onClick={() => { scheduleClockOut(min); setOpen(false); }}
                      style={{
                        border: '1px solid rgba(var(--copper-glow-rgb), 0.18)',
                        borderRadius: 6,
                        padding: '5px 0',
                        fontSize: 11,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.6)',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            <button
              onClick={() => { clockInNow(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                border: '1px solid rgba(var(--copper-glow-rgb), 0.3)',
                borderRadius: 7,
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--copper-2)',
                background: 'rgba(var(--copper-glow-rgb), 0.14)',
                cursor: 'pointer',
              }}
            >
              <Briefcase style={{ width: 12, height: 12 }} />
              Clock in to Work Mode
            </button>
          )}

          <div style={{ height: 1, background: 'rgba(var(--copper-glow-rgb), 0.15)', margin: '4px 2px' }} />

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button onClick={() => setToolsOpen(o => !o)} style={rowStyle(toolsOpen)}>
              <Wrench style={{ width: 12, height: 12 }} />
              Tools
            </button>

            {toolsOpen && (
              <div
                style={{
                  position: 'absolute',
                  left: 'calc(100% + 6px)',
                  top: 0,
                  ...pillBase,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 6,
                  padding: 6,
                }}
              >
                {TOOLS_SUBMENU.map(item => (
                  <button key={item.id} title={item.label} onClick={() => openLeaf(item)} style={iconButtonStyle}>
                    <item.icon style={{ width: 18, height: 18 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => { router.push('/settings'); closeAll(); }} style={rowStyle(false)}>
            <Settings style={{ width: 12, height: 12 }} />
            Settings
          </button>

          <button onClick={handleLogout} style={rowStyle(false)}>
            <LogOut style={{ width: 12, height: 12 }} />
            Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title={mode === 'work' ? 'Clock out' : 'Clock in'}
        style={{
          ...pillBase,
          position: 'relative',
          width: 34,
          height: 34,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? 'var(--copper-2)' : 'rgba(255,255,255,0.5)',
          background: open ? 'rgba(var(--copper-glow-rgb), 0.18)' : pillBase.background,
          cursor: 'pointer',
        }}
      >
        <Settings style={{ width: 15, height: 15 }} />
        {clockoutTarget != null && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 3,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--copper-2)',
              boxShadow: '0 0 6px rgba(var(--copper-glow-rgb), 0.8)',
            }}
          />
        )}
      </button>
    </div>
  );
}
