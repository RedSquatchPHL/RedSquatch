// Palette + clock mapping for the HomeSquatch ocean background.
// Palettes are from "TIDES – A Cinematic Canvas Ocean" by Chathura-Jayasanka
// (codepen.io/Chathura-Jayasanka/pen/emBMYWJ), supplied by the user. The renderer
// (components/hs/OceanBackground.tsx) is a 2D-canvas port of the same painting.

export type RGB = [number, number, number];

export interface Pal {
  skyTop: RGB; skyHor: RGB; sun: RGB; glow: RGB; wFar: RGB; wNear: RGB; foam: RGB;
  sunH: number;   // sun height above horizon, 0..1
  glit: number;   // sun glitter strength
  star: number;   // star visibility
  scrim: number;  // readability scrim opacity laid over the whole scene
}

export const PRESET_NAMES = ['Dawn', 'Morning', 'Midday', 'Golden hour', 'Sunset', 'Moonlit'] as const;
export type Override = 'auto' | 0 | 1 | 2 | 3 | 4 | 5;

export const KEYS: Pal[] = [
  { skyTop: [38, 44, 86],  skyHor: [247, 176, 128], sun: [255, 238, 206], glow: [255, 178, 120], wFar: [176, 150, 150], wNear: [34, 62, 84],  foam: [255, 244, 234], sunH: 0.1,  glit: 0.7,  star: 0,    scrim: 0.36 }, // dawn
  { skyTop: [64, 134, 206], skyHor: [188, 222, 236], sun: [255, 255, 246], glow: [255, 250, 224], wFar: [120, 186, 196], wNear: [20, 92, 114], foam: [255, 255, 255], sunH: 0.55, glit: 0.5,  star: 0,    scrim: 0.44 }, // morning
  { skyTop: [58, 142, 214], skyHor: [176, 216, 230], sun: [255, 255, 248], glow: [255, 252, 232], wFar: [96, 178, 188],  wNear: [16, 96, 120], foam: [255, 255, 255], sunH: 0.92, glit: 0.45, star: 0,    scrim: 0.46 }, // midday
  { skyTop: [74, 92, 156],  skyHor: [255, 202, 120], sun: [255, 236, 194], glow: [255, 168, 92],  wFar: [206, 164, 118], wNear: [34, 78, 98], foam: [255, 244, 228], sunH: 0.3,  glit: 0.95, star: 0,    scrim: 0.34 }, // golden hour
  { skyTop: [48, 38, 86],   skyHor: [255, 108, 68],  sun: [255, 206, 148], glow: [255, 92, 58],   wFar: [188, 98, 84],   wNear: [30, 42, 72], foam: [255, 222, 200], sunH: 0.06, glit: 1.0,  star: 0.15, scrim: 0.3 },  // sunset
  { skyTop: [8, 12, 30],    skyHor: [34, 44, 82],    sun: [228, 234, 255], glow: [140, 164, 216], wFar: [28, 42, 76],    wNear: [6, 16, 32],  foam: [196, 208, 234], sunH: 0.55, glit: 0.55, star: 1,    scrim: 0.16 }, // moonlit
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function blend(a: Pal, b: Pal, k: number): Pal {
  return {
    skyTop: lerpRGB(a.skyTop, b.skyTop, k), skyHor: lerpRGB(a.skyHor, b.skyHor, k),
    sun: lerpRGB(a.sun, b.sun, k), glow: lerpRGB(a.glow, b.glow, k),
    wFar: lerpRGB(a.wFar, b.wFar, k), wNear: lerpRGB(a.wNear, b.wNear, k), foam: lerpRGB(a.foam, b.foam, k),
    sunH: lerp(a.sunH, b.sunH, k), glit: lerp(a.glit, b.glit, k), star: lerp(a.star, b.star, k), scrim: lerp(a.scrim, b.scrim, k),
  };
}

// Same sunrise/sunset approximation as ThemeContext (~40°N, ±30 min), so the
// background and the app's day/night logic agree.
function getSunTimes(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const offset = Math.cos((2 * Math.PI * (day - 172)) / 365);
  return { sunrise: 6 - 2 * offset, sunset: 18 + 2 * offset };
}

// Real clock -> palette. Keyframes (hours) follow today's sunrise/sunset, and the
// ends blend moonlit <-> dawn so there is never a jump.
export function paletteForClock(d: Date): Pal {
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const { sunrise, sunset } = getSunTimes(d);
  const stops: [number, number][] = [
    [sunrise - 1.3, 5], [sunrise - 0.1, 0], [sunrise + 3.5, 1], [(sunrise + sunset) / 2, 2],
    [sunset - 1.6, 3], [sunset - 0.15, 4], [sunset + 1.6, 5],
  ];
  if (h <= stops[0][0] || h >= stops[stops.length - 1][0]) return KEYS[5];
  let i = 0;
  while (h >= stops[i + 1][0]) i++;
  const [ha, ka] = stops[i];
  const [hb, kb] = stops[i + 1];
  return blend(KEYS[ka], KEYS[kb], (h - ha) / (hb - ha));
}

export function targetPalette(o: Override, now: Date): Pal {
  return o === 'auto' ? paletteForClock(now) : KEYS[o];
}

// ---- manual override (header button) ----
const KEY = 'rs.hs.ocean.preset.v1';
const EVT = 'rs-ocean-preset';

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
