import { API } from '@/lib/api';
import type { GateMode, GatePhase } from '@/lib/homesquatch-gate';

// Scene indices match the shader (see oceanShader.ts).
export const SCENES = ['Dawn', 'Midday', 'Dusk', 'Storm', 'Night', 'Pre-dawn'] as const;
export type Override = 'auto' | 0 | 1 | 2 | 3 | 4 | 5;

// How dark the readability scrim sits over each scene (midday is the brightest).
export const SCRIM_ALPHA = [0.34, 0.46, 0.3, 0.26, 0.16, 0.28];

// Fallback gradients (top -> bottom) when WebGL is unavailable.
export const FALLBACK_GRADIENT = [
  'linear-gradient(180deg,#6b86c4 0%,#f5a65b 48%,#2a1a14 49%,#120b08 100%)',
  'linear-gradient(180deg,#1d4fa8 0%,#86b0e0 48%,#0e3b52 49%,#08202e 100%)',
  'linear-gradient(180deg,#3a1458 0%,#e0431a 48%,#2b160c 49%,#120a06 100%)',
  'linear-gradient(180deg,#0b0d12 0%,#2b2f3b 48%,#12151b 49%,#080a0d 100%)',
  'linear-gradient(180deg,#03030c 0%,#0a0b1c 48%,#070a18 49%,#03040a 100%)',
  'linear-gradient(180deg,#6a6ca4 0%,#c98ba3 48%,#17172a 49%,#0a0a14 100%)',
];

const KEY = 'rs.hs.ocean.scene.v1';
const EVT = 'rs-ocean-scene';

export function loadOverride(): Override {
  try {
    const q = new URLSearchParams(window.location.search).get('ocean');
    if (q !== null && /^[0-5]$/.test(q)) return Number(q) as Override;
    const raw = localStorage.getItem(KEY);
    if (raw && /^[0-5]$/.test(raw)) return Number(raw) as Override;
  } catch { /* storage blocked: stay on auto */ }
  return 'auto';
}

export function saveOverride(o: Override) {
  try { localStorage.setItem(KEY, o === 'auto' ? '' : String(o)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent<Override>(EVT, { detail: o }));
}

export function subscribeOverride(cb: (o: Override) => void) {
  const on = (e: Event) => cb((e as CustomEvent<Override>).detail);
  window.addEventListener(EVT, on);
  return () => window.removeEventListener(EVT, on);
}

export function nextOverride(o: Override): Override {
  if (o === 'auto') return 0;
  return o === 5 ? 'auto' : ((o + 1) as Override);
}

// Same clock the Work/Downtime theme uses, so the scene and the panel art agree:
//   work hours           -> midday      dusk phase     -> dusk
//   midnight phase       -> night       predawn phase  -> pre-dawn until 6, then dawn
// A real thunderstorm overrides everything with the storm scene.
export function autoScene(mode: GateMode, phase: GatePhase, hour: number, storm: boolean): 0 | 1 | 2 | 3 | 4 | 5 {
  if (storm) return 3;
  if (mode === 'work' && !phase) return 1;
  if (phase === 'dusk') return 2;
  if (phase === 'midnight') return 4;
  if (phase === 'predawn') return hour < 6 ? 5 : 0;
  return 1;
}

// Thunderstorm check against the same feed WeatherBackground used.
export async function fetchIsStorm(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/client/quick-info/weather`, { credentials: 'include' });
    if (!r.ok) return false;
    const d = await r.json();
    const c = String(d?.current?.condition ?? '').toLowerCase();
    return c.includes('thunder') || c.includes('storm') || d?.current?.emoji === '⛈️';
  } catch {
    return false;
  }
}
