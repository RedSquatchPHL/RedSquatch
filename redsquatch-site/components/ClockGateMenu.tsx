'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Settings, Sunset, Briefcase, X, Link2, ArrowLeftRight, LogOut } from 'lucide-react';
import { useHomeSquatchGate } from './HomeSquatchGate';
import { logout } from '@/lib/api';
import { WS_NAV, HS_NAV, QUICK_LINKS_SUBMENU, type MenuLeaf } from '@/lib/menuConfig';

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
// /hs/dashboard (those are unrelated and untouched). This is now the site's one
// profile/nav menu, replacing both the old per-page WS BottomToolbar and the shared HS
// HSToolbar: Clock In/Out, then whichever primary nav list (WS_NAV or HS_NAV, config in
// lib/menuConfig.ts) matches the current route — never both at once, so same-named
// items like "Tools" never collide — and Switch, then Quick Links (icon-only
// external-service submenu), Settings and Log out. Reachable from every route via
// GlobalEffects.tsx. A small dot on the badge signals a pending scheduled clock-out
// even while the panel is closed.
export default function ClockGateMenu() {
  const { mode, clockoutTarget, clockOutNow, scheduleClockOut, cancelClockOut, clockInNow } = useHomeSquatchGate();
  const router = useRouter();
  const pathname = usePathname();
  const inHS = pathname?.startsWith('/hs') ?? false;
  const navItems = inHS ? HS_NAV : WS_NAV;
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

  // Mirrors BottomToolbar's/HSToolbar's old one-directional "Switch" tiles (same
  // localStorage mode flag — unread anywhere in the codebase as of this writing, kept
  // for parity rather than removed, out of scope here), now bidirectional since one
  // menu covers both sides: flips based on whichever nav list is currently showing.
  function handleSwitch() {
    if (inHS) {
      localStorage.setItem('redsquatch-mode', 'work');
      router.push('/ws/dashboard');
    } else {
      localStorage.setItem('redsquatch-mode', 'home');
      router.push('/hs/dashboard');
    }
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

          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => openLeaf(item)}
              style={rowStyle(item.type === 'internal' && pathname === item.path)}
            >
              <item.icon style={{ width: 12, height: 12 }} />
              {item.label}
            </button>
          ))}

          <button onClick={handleSwitch} style={rowStyle(false)}>
            <ArrowLeftRight style={{ width: 12, height: 12 }} />
            Switch
          </button>

          <div style={{ height: 1, background: 'rgba(var(--copper-glow-rgb), 0.15)', margin: '4px 2px' }} />

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button onClick={() => setToolsOpen(o => !o)} style={rowStyle(toolsOpen)}>
              <Link2 style={{ width: 12, height: 12 }} />
              Quick Links
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
                {QUICK_LINKS_SUBMENU.map(item => (
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
