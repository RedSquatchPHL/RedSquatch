'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import WeatherCanvas from './WeatherCanvas';

interface CurrentWeather {
  tempF: number; feelsLikeF: number; condition: string; emoji: string;
  humidity: number; windMph: number; highF: number | null; lowF: number | null;
}
interface ForecastDay { label: string; date: string; highF: number; lowF: number; condition: string; emoji: string; }
interface WeatherData { location: string; current: CurrentWeather; forecast: ForecastDay[]; updated: string; }

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 2)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function WeatherWidget() {
  const [data, setData]             = useState<WeatherData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  async function load(force = false) {
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/client/quick-info/weather${force ? '?force=true' : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const cur = data?.current;

  return (
    <div className="glass-card relative rounded-2xl overflow-hidden min-h-[160px]">

      {/* ── Animated weather canvas (fills card background) ── */}
      {cur && (
        <>
          <WeatherCanvas
            condition={cur.condition}
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.5 }}
          />
          {/* readability scrim — stronger at top/bottom where text lives */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.15) 45%, rgba(6,6,6,0.45) 100%)',
            }}
          />
        </>
      )}

      {/* ── Content (z-10 so it sits above canvas) ── */}
      <div className="relative z-10 p-5 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(184,115,51,0.9)' }}>
              Weather
            </span>
            {data?.location && (
              <span className="text-[11px] ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>· {data.location}</span>
            )}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing || loading}
            title="Refresh weather"
            className="glass-btn text-xs px-2.5 py-1 rounded-lg"
          >
            {refreshing ? '…' : '↻'}
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-muted-foreground text-sm animate-pulse">Loading…</span>
          </div>
        ) : error ? (
          <p className="text-red-400 text-xs">{error}</p>
        ) : data && cur ? (
          <div className="flex-1 flex flex-col gap-3">
            {/* Today — big row */}
            <div className="flex items-center gap-3">
              <span className="text-4xl leading-none">{cur.emoji}</span>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 12px rgba(184,115,51,0.5)' }}>
                    {cur.tempF}°
                  </span>
                  <span className="text-sm text-muted-foreground">F</span>
                </div>
                <p className="text-sm text-foreground/80">{cur.condition}</p>
              </div>
              <div className="ml-auto text-right text-xs text-muted-foreground space-y-0.5">
                {cur.highF !== null && (
                  <p>
                    <span style={{ color: '#b87333' }}>H</span> {cur.highF}°
                    <span className="mx-1 opacity-50">·</span>
                    <span className="text-blue-400/70">L</span> {cur.lowF}°
                  </p>
                )}
                <p>💧 {cur.humidity}%</p>
                <p>💨 {cur.windMph} mph</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-primary/10" />

            {/* 2-day forecast */}
            <div className="grid grid-cols-2 gap-2">
              {data.forecast.map((day, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'rgba(184,115,51,0.06)', border: '1px solid rgba(184,115,51,0.12)' }}
                >
                  <span className="text-xl leading-none">{day.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{day.label}</p>
                    <p className="text-xs text-foreground/70 truncate">{day.condition}</p>
                    <p className="text-xs tabular-nums">
                      <span style={{ color: '#b87333' }}>{day.highF}°</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-blue-400/70">{day.lowF}°</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <p className="text-[10px] text-muted-foreground/50 text-right -mt-1">
              Updated {relTime(data.updated)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Copper accent line */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px rounded z-10"
        style={{ background: 'linear-gradient(90deg, transparent, #b87333 50%, transparent)' }}
      />
    </div>
  );
}
