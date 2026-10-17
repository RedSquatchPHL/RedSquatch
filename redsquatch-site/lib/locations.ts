// Saved locations for the /ws header weather + world-clock widgets.
// Browser-local (localStorage); a custom event keeps the two header chips in
// sync within a tab. Data sources are Open-Meteo (weather + geocoding, no key)
// and Intl (time zones).

export interface Loc {
  id: string;
  name: string;
  sub: string; // "Pennsylvania, United States"
  lat: number;
  lon: number;
  tz: string; // IANA zone
}

export interface LocState {
  locs: Loc[];
  primaryId: string;
  units: 'F' | 'C';
  hour12: boolean;
}

export const DEFAULT_STATE: LocState = {
  locs: [{ id: 'philadelphia', name: 'Philadelphia', sub: 'Pennsylvania, United States', lat: 39.9526, lon: -75.1652, tz: 'America/New_York' }],
  primaryId: 'philadelphia',
  units: 'F',
  hour12: true,
};

const KEY = 'rs.ws.locations.v1';
const EVT = 'rs-locations-change';

export function loadState(): LocState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const p = JSON.parse(raw) as Partial<LocState>;
    if (!Array.isArray(p.locs) || p.locs.length === 0) return DEFAULT_STATE;
    const primaryId = p.locs.some(l => l.id === p.primaryId) ? (p.primaryId as string) : p.locs[0].id;
    return { locs: p.locs, primaryId, units: p.units === 'C' ? 'C' : 'F', hour12: p.hour12 !== false };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(next: LocState) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: in-tab sync still works */ }
  window.dispatchEvent(new CustomEvent<LocState>(EVT, { detail: next }));
}

export function subscribe(cb: (s: LocState) => void) {
  const onEvt = (e: Event) => cb((e as CustomEvent<LocState>).detail);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(loadState()); };
  window.addEventListener(EVT, onEvt);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVT, onEvt);
    window.removeEventListener('storage', onStorage);
  };
}

// ---- Open-Meteo ----

interface GeoResult { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }

export async function searchPlaces(q: string): Promise<Loc[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
  if (!res.ok) throw new Error('geocoding failed');
  const json = (await res.json()) as { results?: GeoResult[] };
  return (json.results ?? []).map(r => ({
    id: String(r.id),
    name: r.name,
    sub: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
    tz: r.timezone ?? 'UTC',
  }));
}

export interface Weather {
  temp: number;
  feels: number;
  code: number;
  isDay: boolean;
  days: { date: string; code: number; hi: number; lo: number }[];
}

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Weather }>();

export async function fetchWeather(loc: Loc, units: 'F' | 'C'): Promise<Weather> {
  const key = `${loc.lat},${loc.lon},${units}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5` +
    `&temperature_unit=${units === 'F' ? 'fahrenheit' : 'celsius'}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather failed');
  const j = await res.json();
  const data: Weather = {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    isDay: j.current.is_day === 1,
    days: (j.daily.time as string[]).map((date, i) => ({
      date,
      code: j.daily.weather_code[i],
      hi: Math.round(j.daily.temperature_2m_max[i]),
      lo: Math.round(j.daily.temperature_2m_min[i]),
    })),
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

// WMO weather code -> kind (icon) + label
export type Kind = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
export function describe(code: number): { kind: Kind; label: string } {
  if (code === 0) return { kind: 'clear', label: 'Clear' };
  if (code <= 2) return { kind: 'partly', label: 'Partly cloudy' };
  if (code === 3) return { kind: 'cloud', label: 'Overcast' };
  if (code === 45 || code === 48) return { kind: 'fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { kind: 'drizzle', label: 'Drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', label: 'Rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: 'Snow' };
  if (code >= 95) return { kind: 'storm', label: 'Thunderstorm' };
  return { kind: 'cloud', label: 'Cloudy' };
}

// ---- Time zones ----

function zoneParts(tz: string, at: Date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(at)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}

// Minutes the zone's wall clock is ahead of UTC at this instant.
function offsetMin(tz: string, at: Date) {
  const o = zoneParts(tz, at);
  return Math.round((Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute) - at.getTime()) / 60000);
}

export function formatTime(tz: string, at: Date, hour12: boolean) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12 }).format(at);
}

// "same time", "+5h", "-3h 30m", with a "tomorrow"/"yesterday" tag when the date differs from yours.
export function relativeTo(tz: string, at: Date): { offset: string; day: string } {
  const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const diff = offsetMin(tz, at) - offsetMin(here, at);
  let offset = 'same time';
  if (diff !== 0) {
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    offset = `${diff > 0 ? '+' : '-'}${h}h${m ? ` ${m}m` : ''}`;
  }
  const a = zoneParts(tz, at);
  const b = zoneParts(here, at);
  const dayDiff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86400000);
  return { offset, day: dayDiff > 0 ? 'tomorrow' : dayDiff < 0 ? 'yesterday' : '' };
}
