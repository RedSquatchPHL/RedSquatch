'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type GateMode,
  type GatePhase,
  effectiveMode,
  effectivePhase,
  autoMode,
  msUntilNextBoundary,
  readOverride,
  writeOverride,
  readClockoutTarget,
  writeClockoutTarget,
  clearClockoutTarget,
} from '@/lib/homesquatch-gate';

interface GateCtx {
  mode: GateMode;
  phase: GatePhase; // Evening Shift sub-phase — 'dusk' | 'midnight' | 'predawn' | null (Work Mode)
  isManual: boolean;
  clockoutTarget: number | null; // epoch ms of a pending scheduled clock-out, or null
  clockOutNow: () => void;
  scheduleClockOut: (minutes: number) => void;
  cancelClockOut: () => void;
  clockInNow: () => void;
}

const Ctx = createContext<GateCtx>({
  mode: 'work',
  phase: null,
  isManual: false,
  clockoutTarget: null,
  clockOutNow: () => {},
  scheduleClockOut: () => {},
  cancelClockOut: () => {},
  clockInNow: () => {},
});

// How long the crossfade between palettes takes. Kept in sync with the
// transition durations declared in styles/homesquatch-theme.css.
const TRANSITION_MS = 1150;

const PHASE_CLASSES = ['homesquatch-phase-dusk', 'homesquatch-phase-midnight', 'homesquatch-phase-predawn'];

// Toggles the .homesquatch-theme + .homesquatch-phase-* classes on <html> (matching the
// boot script), briefly arming a "transitioning" class beforehand so
// styles/homesquatch-theme.css's !important transition rules take over for a gradual
// crossfade instead of a hard cut. Only actually arms it when something is changing, so
// mount-time sync (matching what the boot script already applied) doesn't trigger a
// pointless transition flag. Phase changes (dusk -> midnight -> predawn) get the same
// crossfade treatment as the work/downtime mode switch itself.
function applyTheme(mode: GateMode, phase: GatePhase) {
  const root = document.documentElement;
  const isDowntime = mode === 'downtime';
  const nextPhaseClass = phase ? `homesquatch-phase-${phase}` : null;

  const modeChanged = root.classList.contains('homesquatch-theme') !== isDowntime;
  const phaseChanged = nextPhaseClass !== null && !root.classList.contains(nextPhaseClass);
  const changed = modeChanged || phaseChanged;

  if (changed) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      root.classList.add('rs-theme-transitioning');
      window.setTimeout(() => root.classList.remove('rs-theme-transitioning'), TRANSITION_MS);
    }
  }

  root.classList.toggle('homesquatch-theme', isDowntime);
  root.classList.remove(...PHASE_CLASSES);
  if (nextPhaseClass) root.classList.add(nextPhaseClass);
}

export function HomeSquatchGateProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<GateMode>('work');
  const [phase, setPhase] = useState<GatePhase>(null);
  const [isManual, setIsManual] = useState(false);
  const [clockoutTarget, setClockoutTargetState] = useState<number | null>(null);

  function refresh() {
    const override = readOverride();
    const m = override ?? autoMode();
    const p = effectivePhase(m);
    setMode(m);
    setPhase(p);
    setIsManual(override !== null);
    applyTheme(m, p);
  }

  // Boot: sync with whatever the pre-hydration script already applied, then keep
  // re-checking — once precisely at the next phase/mode boundary (3/8/17/22), and every
  // 30s as cheap insurance against timer drift (e.g. the laptop was asleep).
  useEffect(() => {
    setClockoutTargetState(readClockoutTarget());
    refresh();

    let boundaryTimer: number;
    function scheduleBoundaryCheck() {
      boundaryTimer = window.setTimeout(() => {
        refresh();
        scheduleBoundaryCheck();
      }, msUntilNextBoundary());
    }
    scheduleBoundaryCheck();

    const poll = window.setInterval(refresh, 30_000);
    return () => {
      window.clearTimeout(boundaryTimer);
      window.clearInterval(poll);
    };
  }, []);

  // Live countdown for a scheduled clock-out; fires the switch once the target passes.
  useEffect(() => {
    if (clockoutTarget == null) return;
    const id = window.setInterval(() => {
      if (Date.now() >= clockoutTarget) {
        writeOverride('downtime');
        clearClockoutTarget();
        setClockoutTargetState(null);
        refresh();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [clockoutTarget]);

  const clockOutNow = () => {
    writeOverride('downtime');
    clearClockoutTarget();
    setClockoutTargetState(null);
    refresh();
  };

  const scheduleClockOut = (minutes: number) => {
    if (minutes <= 0) { clockOutNow(); return; }
    const target = Date.now() + minutes * 60_000;
    writeClockoutTarget(target);
    setClockoutTargetState(target);
  };

  const cancelClockOut = () => {
    clearClockoutTarget();
    setClockoutTargetState(null);
  };

  // Forces Work Mode immediately, any time of day (e.g. starting early, or working late
  // into what would normally be a downtime phase). Symmetric with clockOutNow — an
  // override in either direction self-expires at the next real 8 AM boundary either way,
  // so there's no separate "back to auto" action needed; clocking out again later just
  // overwrites this override the same way.
  const clockInNow = () => {
    writeOverride('work');
    clearClockoutTarget();
    setClockoutTargetState(null);
    refresh();
  };

  return (
    <Ctx.Provider
      value={{ mode, phase, isManual, clockoutTarget, clockOutNow, scheduleClockOut, cancelClockOut, clockInNow }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useHomeSquatchGate = () => useContext(Ctx);
