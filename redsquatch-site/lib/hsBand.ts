'use client';

import { useEffect, useState } from 'react';
import { getSunTimes, loadOverride, subscribeOverride, type Override } from './oceanScene';

// HomeSquatch "beach" theme: one light, rounded look with three tones that follow the ocean
// scene (components/hs/OceanBackground). Tokens live in styles/hs-beach.css, keyed on
// [data-hs-theme="beach"][data-band]. See that file for what each band looks like.
//   day   — morning / midday: light sea-glass, coral accent
//   warm  — dawn / golden hour / sunset: warm light glass, brick accent
//   night — moonlit: dark glass, sand-gold accent
export type HsBand = 'day' | 'warm' | 'night';

// Preset index (see PRESET_NAMES in oceanScene.ts) -> band.
const PRESET_BAND: HsBand[] = ['warm', 'day', 'day', 'warm', 'warm', 'night'];

// Same sunrise/sunset the ocean palette follows, so panels and scene change together.
export function bandForClock(d: Date): HsBand {
  const h = d.getHours() + d.getMinutes() / 60;
  const { sunrise, sunset } = getSunTimes(d);
  if (h < sunrise - 0.7 || h >= sunset + 0.5) return 'night';
  if (h < sunrise + 1.2 || h >= sunset - 1.6) return 'warm';
  return 'day';
}

export function bandFor(o: Override, now: Date): HsBand {
  return o === 'auto' ? bandForClock(now) : PRESET_BAND[o];
}

export function useHsBand(): HsBand {
  const [band, setBand] = useState<HsBand>('day');
  useEffect(() => {
    let override = loadOverride();
    const update = () => setBand(bandFor(override, new Date()));
    update();
    const unsub = subscribeOverride(o => { override = o; update(); });
    const id = window.setInterval(update, 60_000);
    return () => { unsub(); window.clearInterval(id); };
  }, []);
  return band;
}

// ---- beach theme flag: on by default; Settings (or ?beach=0) switches back to the classic phase look ----
const BEACH_KEY = 'rs.hs.beach.v1';
const BEACH_EVT = 'rs-hs-beach';

export function loadBeach(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('beach');
    if (q === '1' || q === '0') { localStorage.setItem(BEACH_KEY, q); return q === '1'; }
    return localStorage.getItem(BEACH_KEY) !== '0';
  } catch { return true; }
}

export function saveBeach(on: boolean) {
  try { localStorage.setItem(BEACH_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent<boolean>(BEACH_EVT, { detail: on }));
}

export function useHsBeach(): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(loadBeach());
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(BEACH_EVT, h);
    return () => window.removeEventListener(BEACH_EVT, h);
  }, []);
  return on;
}
