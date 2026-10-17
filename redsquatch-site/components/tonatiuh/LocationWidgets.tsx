'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sun, Moon, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Globe, Star, X, Search } from 'lucide-react';
import {
  DEFAULT_STATE, loadState, saveState, subscribe, searchPlaces, fetchWeather, describe, formatTime, relativeTo,
  type Loc, type LocState, type Weather, type Kind,
} from '@/lib/locations';
import Bi from './Bi';
import s from './LocationWidgets.module.css';

const ICONS: Record<Kind, typeof Sun> = {
  clear: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
};

function WxIcon({ code, isDay = true, size = 16 }: { code: number; isDay?: boolean; size?: number }) {
  const { kind } = describe(code);
  const Icon = kind === 'clear' && !isDay ? Moon : ICONS[kind];
  return <Icon size={size} aria-hidden />;
}

function useLocState() {
  const [st, setSt] = useState<LocState>(DEFAULT_STATE);
  useEffect(() => {
    setSt(loadState());
    return subscribe(setSt);
  }, []);
  return st;
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useWeather(loc: Loc | undefined, units: 'F' | 'C') {
  const [wx, setWx] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!loc) return;
    let live = true;
    setFailed(false);
    fetchWeather(loc, units).then(w => { if (live) setWx(w); }).catch(() => { if (live) { setWx(null); setFailed(true); } });
    return () => { live = false; };
  }, [loc, units]);
  return { wx, failed };
}

const dayName = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });

// One saved-location row: name, local time, current temperature.
function Row({ loc, st, now, primary, onPrimary, onRemove, canRemove }: {
  loc: Loc; st: LocState; now: Date | null; primary: boolean; onPrimary: () => void; onRemove: () => void; canRemove: boolean;
}) {
  const { wx } = useWeather(loc, st.units);
  const rel = now ? relativeTo(loc.tz, now) : null;
  return (
    <li className={s.row}>
      <button type="button" className={`${s.iconBtn} ${primary ? s.iconBtnOn : ''}`} onClick={onPrimary} aria-label={primary ? `${loc.name} is primary` : `Make ${loc.name} primary`} title="Principal (Primary)">
        <Star size={14} fill={primary ? 'currentColor' : 'none'} />
      </button>
      <div className={s.rowMain}>
        <div className={s.rowName}>{loc.name}</div>
        <div className={s.rowSub}>{loc.sub}{rel && rel.day ? ` · ${rel.day}` : ''}</div>
      </div>
      <div className={s.rowRight}>
        <div className={s.rowTime}>{now ? formatTime(loc.tz, now, st.hour12) : '--'}</div>
        <div className={s.rowSub}>
          {wx ? <><WxIcon code={wx.code} isDay={wx.isDay} size={12} /> {wx.temp}°</> : '—'}
          {rel ? ` · ${rel.offset}` : ''}
        </div>
      </div>
      <button type="button" className={s.iconBtn} onClick={onRemove} disabled={!canRemove} aria-label={`Remove ${loc.name}`} title="Quitar (Remove)">
        <X size={14} />
      </button>
    </li>
  );
}

function ManagePanel({ st, now, onClose }: { st: LocState; now: Date | null; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Loc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const update = (patch: Partial<LocState>) => saveState({ ...st, ...patch });

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setErr('');
    try {
      setResults(await searchPlaces(q.trim()));
    } catch {
      setErr('No se pudo buscar (Search failed)');
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  function add(loc: Loc) {
    if (!st.locs.some(l => l.id === loc.id)) update({ locs: [...st.locs, loc] });
    setResults(null);
    setQ('');
  }

  function remove(id: string) {
    const locs = st.locs.filter(l => l.id !== id);
    if (locs.length === 0) return;
    update({ locs, primaryId: st.primaryId === id ? locs[0].id : st.primaryId });
  }

  return (
    <div className={s.panel} role="dialog" aria-label="Ubicaciones (Locations)">
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}><Bi es="Ubicaciones" en="Locations" inline /></h2>
        <div className={s.toggles}>
          <button type="button" className={`${s.toggle} ${st.units === 'F' ? s.toggleOn : ''}`} onClick={() => update({ units: 'F' })}>°F</button>
          <button type="button" className={`${s.toggle} ${st.units === 'C' ? s.toggleOn : ''}`} onClick={() => update({ units: 'C' })}>°C</button>
          <span className={s.toggleGap} />
          <button type="button" className={`${s.toggle} ${st.hour12 ? s.toggleOn : ''}`} onClick={() => update({ hour12: true })}>12h</button>
          <button type="button" className={`${s.toggle} ${!st.hour12 ? s.toggleOn : ''}`} onClick={() => update({ hour12: false })}>24h</button>
        </div>
        <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Cerrar (Close)"><X size={16} /></button>
      </div>

      <ul className={s.rows}>
        {st.locs.map(l => (
          <Row key={l.id} loc={l} st={st} now={now} primary={l.id === st.primaryId}
            onPrimary={() => update({ primaryId: l.id })} onRemove={() => remove(l.id)} canRemove={st.locs.length > 1} />
        ))}
      </ul>

      <form className={s.addForm} onSubmit={doSearch}>
        <Search size={14} className={s.addIcon} />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Agregar ciudad… (Add a city)"
          className={s.addInput}
          aria-label="Add a city"
        />
        <button type="submit" className={s.addBtn} disabled={busy || q.trim().length < 2}>{busy ? '…' : <Bi es="Buscar" en="Search" inline />}</button>
      </form>
      {err && <p className={s.msg}>{err}</p>}
      {results && results.length === 0 && <p className={s.msg}>Sin resultados (No matches)</p>}
      {results && results.length > 0 && (
        <ul className={s.results}>
          {results.map(r => (
            <li key={r.id}>
              <button type="button" className={s.result} onClick={() => add(r)}>
                <span className={s.rowName}>{r.name}</span>
                <span className={s.rowSub}>{r.sub || r.tz} · {r.tz}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Header weather + world-clock chips. Hover shows a read-only card; click opens
// the shared locations panel where places are added, removed and starred.
export default function LocationWidgets() {
  const st = useLocState();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const primary = st.locs.find(l => l.id === st.primaryId) ?? st.locs[0];
  const { wx, failed } = useWeather(primary, st.units);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  const desc = wx ? describe(wx.code).label : '';

  return (
    <div className={s.wrap} ref={wrapRef}>
      <div className={s.chipWrap}>
        <button type="button" className={s.chip} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={`Clima (Weather) ${primary.name}${wx ? `, ${wx.temp}°` : ''}`}>
          {wx ? <WxIcon code={wx.code} isDay={wx.isDay} /> : <Cloud size={16} aria-hidden />}
          <span className={s.chipText}>{wx ? `${wx.temp}°` : failed ? '—' : '…'}</span>
        </button>
        {!open && (
          <div className={s.hover} role="tooltip">
            <div className={s.hoverTitle}><Bi es="Clima" en="Weather" inline /> · {primary.name}</div>
            {wx ? (
              <>
                <div className={s.hoverNow}>
                  <WxIcon code={wx.code} isDay={wx.isDay} size={28} />
                  <div>
                    <div className={s.big}>{wx.temp}°{st.units}</div>
                    <div className={s.rowSub}>{desc} · sensación {wx.feels}° (feels like)</div>
                  </div>
                </div>
                <ul className={s.strip}>
                  {wx.days.map((d, i) => (
                    <li key={d.date} className={s.day}>
                      <span className={s.rowSub}>{i === 0 ? 'Hoy' : dayName(d.date)}</span>
                      <WxIcon code={d.code} size={16} />
                      <span className={s.dayHi}>{d.hi}°</span>
                      <span className={s.rowSub}>{d.lo}°</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={s.msg}>{failed ? 'Clima no disponible (Weather unavailable)' : 'Cargando… (Loading)'}</p>
            )}
            <p className={s.hint}>Clic para ubicaciones (Click for locations)</p>
          </div>
        )}
      </div>

      <div className={s.chipWrap}>
        <button type="button" className={s.chip} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Hora mundial (World clock)">
          <Globe size={16} aria-hidden />
          <span className={s.chipText}>{now ? formatTime(primary.tz, now, st.hour12) : '--'}</span>
        </button>
        {!open && (
          <div className={s.hover} role="tooltip">
            <div className={s.hoverTitle}><Bi es="Hora mundial" en="World clock" inline /></div>
            <ul className={s.clockList}>
              {st.locs.map(l => {
                const rel = now ? relativeTo(l.tz, now) : null;
                return (
                  <li key={l.id} className={s.clockRow}>
                    <span className={s.rowName}>{l.name}</span>
                    <span className={s.rowSub}>{rel ? `${rel.offset}${rel.day ? ` · ${rel.day}` : ''}` : ''}</span>
                    <span className={s.rowTime}>{now ? formatTime(l.tz, now, st.hour12) : '--'}</span>
                  </li>
                );
              })}
            </ul>
            <p className={s.hint}>Clic para agregar (Click to add)</p>
          </div>
        )}
      </div>

      {open && <ManagePanel st={st} now={now} onClose={close} />}
    </div>
  );
}
