'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion';
import {
  BarChart3, Settings, LogOut, ArrowLeftRight,
} from 'lucide-react';
import { API } from '@/lib/api';

// ── Config ─────────────────────────────────────────────────────────────────

export interface DockNavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

export interface DockSwitchConfig {
  label: string;
  href: string;
  mode: 'work' | 'home';
}

const DEFAULT_NAV: DockNavItem[] = [
  { label: 'Dashboard', icon: BarChart3, href: '/dashboard'         },
  { label: 'Tools',     icon: Settings,  href: '/dashboard/tools'   },
];

const BASE     = 48;   // resting icon size (px)
const MAX      = 76;   // magnified icon size (px)
const ZONE     = 160;  // magnification radius (px)
const SPRING   = { mass: 0.1, stiffness: 200, damping: 14 };

// ── Glassmorphic icon surface ───────────────────────────────────────────────

function iconStyle(isActive: boolean): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isActive
      ? 'rgba(184,115,51,0.18)'
      : 'rgba(10,10,10,0.60)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isActive ? 'rgba(184,115,51,0.55)' : 'rgba(184,115,51,0.18)'}`,
    boxShadow: isActive
      ? '0 0 20px rgba(184,115,51,0.28), 0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)'
      : '0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
  };
}

// ── Single dock item ────────────────────────────────────────────────────────

function DockItem({
  mouseX,
  label,
  icon: Icon,
  href,
  isActive,
}: {
  mouseX: MotionValue<number>;
  label: string;
  icon: React.ElementType;
  href: string;
  isActive: boolean;
}) {
  const ref      = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState(false);

  // Distance from cursor to icon centre
  const distance = useTransform(mouseX, val => {
    const b = ref.current?.getBoundingClientRect();
    return b ? val - (b.left + b.width / 2) : 0;
  });

  // Size: magnifies towards cursor, springs back
  const sizeRaw = useTransform(distance, [-ZONE, 0, ZONE], [BASE, MAX, BASE]);
  const size    = useSpring(sizeRaw, SPRING);

  // Vertical lift: icons float upward as cursor approaches
  const yRaw = useTransform(distance, [-ZONE, 0, ZONE], [0, -12, 0]);
  const y    = useSpring(yRaw, SPRING);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className="relative flex flex-col items-center"
    >
      {/* Tooltip */}
      <AnimatePresence>
        {tip && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 4,  scale: 0.92 }}
            transition={{ duration: 0.14 }}
            className="absolute -top-10 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none select-none"
            style={{
              background: 'rgba(6,6,6,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(184,115,51,0.32)',
              color: '#d4a373',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Icon */}
      <Link
        href={href}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        <motion.div style={{ width: size, height: size }}>
          <div style={iconStyle(isActive)}>
            <Icon
              style={{
                width: '40%',
                height: '40%',
                color: isActive ? '#b87333' : 'rgba(255,255,255,0.72)',
              }}
            />
          </div>
        </motion.div>
      </Link>

      {/* Active dot */}
      {isActive && (
        <span
          style={{
            display: 'block',
            width: 4,
            height: 4,
            borderRadius: '50%',
            marginTop: 5,
            background: '#b87333',
            boxShadow: '0 0 6px rgba(184,115,51,0.9)',
          }}
        />
      )}
    </motion.div>
  );
}

// ── Switch dock item ────────────────────────────────────────────────────────

function DockSwitch({ mouseX, config }: { mouseX: MotionValue<number>; config: DockSwitchConfig }) {
  const ref    = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [tip, setTip] = useState(false);

  const distance = useTransform(mouseX, val => {
    const b = ref.current?.getBoundingClientRect();
    return b ? val - (b.left + b.width / 2) : 0;
  });
  const sizeRaw = useTransform(distance, [-ZONE, 0, ZONE], [BASE, MAX, BASE]);
  const size    = useSpring(sizeRaw, SPRING);
  const yRaw    = useTransform(distance, [-ZONE, 0, ZONE], [0, -12, 0]);
  const y       = useSpring(yRaw, SPRING);

  const handleSwitch = () => {
    localStorage.setItem('redsquatch-mode', config.mode);
    router.push(config.href);
  };

  return (
    <motion.div ref={ref} style={{ y }} className="relative flex flex-col items-center">
      <AnimatePresence>
        {tip && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 4,  scale: 0.92 }}
            transition={{ duration: 0.14 }}
            className="absolute -top-10 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none select-none"
            style={{
              background: 'rgba(6,6,6,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(184,115,51,0.32)',
              color: '#d4a373',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            {config.label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.div style={{ width: size, height: size }}>
        <button
          onClick={handleSwitch}
          onMouseEnter={() => setTip(true)}
          onMouseLeave={() => setTip(false)}
          style={{ ...iconStyle(false), cursor: 'pointer', width: '100%', height: '100%' }}
        >
          <ArrowLeftRight style={{ width: '40%', height: '40%', color: 'rgba(255,255,255,0.72)' }} />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Logout dock item ────────────────────────────────────────────────────────

function DockLogout({ mouseX }: { mouseX: MotionValue<number> }) {
  const ref    = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [tip,         setTip]         = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  const distance = useTransform(mouseX, val => {
    const b = ref.current?.getBoundingClientRect();
    return b ? val - (b.left + b.width / 2) : 0;
  });
  const sizeRaw = useTransform(distance, [-ZONE, 0, ZONE], [BASE, MAX, BASE]);
  const size    = useSpring(sizeRaw, SPRING);
  const yRaw    = useTransform(distance, [-ZONE, 0, ZONE], [0, -12, 0]);
  const y       = useSpring(yRaw, SPRING);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`${API}/api/client/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      localStorage.clear();
      router.push('/logout');
    }
  }

  return (
    <motion.div ref={ref} style={{ y }} className="relative flex flex-col items-center">

      {/* Tooltip / confirm panel */}
      <AnimatePresence>
        {(tip && !confirming) && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 4,  scale: 0.92 }}
            transition={{ duration: 0.14 }}
            className="absolute -top-10 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none select-none"
            style={{
              background: 'rgba(6,6,6,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(184,115,51,0.32)',
              color: '#d4a373',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          >
            Log out
          </motion.span>
        )}

        {confirming && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1     }}
            exit={{    opacity: 0, y: 6, scale: 0.95  }}
            transition={{ duration: 0.16 }}
            className="absolute -top-24 flex flex-col items-center gap-2 p-3 rounded-xl"
            style={{
              background: 'rgba(6,6,6,0.92)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(184,115,51,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              minWidth: 110,
            }}
          >
            <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Log out?
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={logout}
                disabled={loggingOut}
                className="text-[11px] px-3 py-1 rounded-lg font-semibold disabled:opacity-40 transition-opacity"
                style={{ background: '#b87333', color: '#0f0f0f' }}
              >
                {loggingOut ? '…' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={loggingOut}
                className="text-[11px] px-3 py-1 rounded-lg border disabled:opacity-40 transition-colors"
                style={{ borderColor: 'rgba(184,115,51,0.3)', color: 'rgba(255,255,255,0.6)' }}
              >
                No
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon button */}
      <motion.div style={{ width: size, height: size }}>
        <button
          onClick={() => { setConfirming(c => !c); setTip(false); }}
          onMouseEnter={() => { if (!confirming) setTip(true); }}
          onMouseLeave={() => setTip(false)}
          style={{ ...iconStyle(false), cursor: 'pointer', width: '100%', height: '100%' }}
        >
          <LogOut style={{ width: '40%', height: '40%', color: 'rgba(255,100,80,0.75)' }} />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Dock container ──────────────────────────────────────────────────────────

export default function MagnificationDock({ nav = DEFAULT_NAV, switchTo }: { nav?: DockNavItem[]; switchTo?: DockSwitchConfig }) {
  const mouseX  = useMotionValue(Infinity);
  const pathname = usePathname();
  const rootHref = nav[0]?.href;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      onMouseMove={e => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {/* Dock shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 24,
          background: 'rgba(8,8,8,0.72)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(184,115,51,0.22)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 1px rgba(184,115,51,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {nav.map(item => {
          const isActive =
            pathname === item.href ||
            (item.href !== rootHref && pathname.startsWith(item.href));
          return (
            <DockItem
              key={item.href}
              mouseX={mouseX}
              label={item.label}
              icon={item.icon}
              href={item.href}
              isActive={isActive}
            />
          );
        })}

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 32,
            background: 'rgba(184,115,51,0.22)',
            borderRadius: 1,
            alignSelf: 'center',
            margin: '0 2px',
          }}
        />

        {switchTo && <DockSwitch mouseX={mouseX} config={switchTo} />}

        <DockLogout mouseX={mouseX} />
      </div>
    </div>
  );
}
