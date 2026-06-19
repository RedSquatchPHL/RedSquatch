'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode   = 'auto' | 'day' | 'night';
export type ActiveTheme = 'day'  | 'night';
export type Season      = 'spring' | 'summer' | 'fall' | 'winter';

interface ThemeCtx {
  mode:    ThemeMode;
  active:  ActiveTheme;
  season:  Season;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  mode: 'auto', active: 'night', season: 'summer', setMode: () => {},
});

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

// Simplified sunrise/sunset for ~40°N (Philadelphia / mid-US East).
// Accurate to ±30 min — good enough for day/night mode switching.
function getSunTimes(date: Date) {
  const day    = getDayOfYear(date);
  const offset = Math.cos((2 * Math.PI * (day - 172)) / 365);
  return {
    sunrise: 6 - 2 * offset,   // ~4 h in June → ~8 h in December
    sunset:  18 + 2 * offset,  // ~20 h in June → ~16 h in December
  };
}

function computeActive(): ActiveTheme {
  const now  = new Date();
  const { sunrise, sunset } = getSunTimes(now);
  const hour = now.getHours() + now.getMinutes() / 60;
  return hour >= sunrise && hour < sunset ? 'day' : 'night';
}

function detectSeason(): Season {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4)  return 'spring';
  if (m >= 5 && m <= 7)  return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode,   setModeState] = useState<ThemeMode>('auto');
  const [active, setActive]    = useState<ActiveTheme>('night');
  const [season]               = useState<Season>(detectSeason);

  function setMode(m: ThemeMode) {
    setModeState(m);
    localStorage.setItem('rs_theme_mode', m);
  }

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const saved = localStorage.getItem('rs_theme_mode') as ThemeMode | null;
    if (saved === 'auto' || saved === 'day' || saved === 'night') setModeState(saved);
  }, []);

  // Recompute active theme whenever mode changes, and re-check every 5 min
  useEffect(() => {
    function tick() {
      setActive(mode === 'auto' ? computeActive() : mode);
    }
    tick();
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Reflect on <html> so CSS [data-theme] selectors work
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', active);
  }, [active]);

  return (
    <Ctx.Provider value={{ mode, active, season, setMode }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
