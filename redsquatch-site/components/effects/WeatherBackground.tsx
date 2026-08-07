'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

type Condition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'night';

// Dark gradients that sit comfortably under copper/obsidian UI
const BG: Record<Condition, string> = {
  sunny:
    'radial-gradient(ellipse 75% 45% at 18% 0%, rgba(210,115,12,0.22) 0%, transparent 55%), ' +
    'linear-gradient(180deg, #100b06 0%, #0c0903 55%, #0f0e08 100%)',
  partly_cloudy:
    'radial-gradient(ellipse 55% 35% at 28% 0%, rgba(175,98,18,0.12) 0%, transparent 50%), ' +
    'linear-gradient(180deg, #0c0d10 0%, #0a0b0e 100%)',
  cloudy:
    'linear-gradient(180deg, #0b0d11 0%, #0e1013 50%, #0b0d10 100%)',
  rain:
    'linear-gradient(172deg, #06080f 0%, #07091430 40%, #060810 100%)',
  storm:
    'radial-gradient(ellipse 65% 38% at 50% 0%, rgba(55,30,82,0.22) 0%, transparent 55%), ' +
    'linear-gradient(180deg, #050508 0%, #070609 100%)',
  snow:
    'linear-gradient(180deg, #08090f 0%, #0b0c15 45%, #070910 100%)',
  fog:
    'linear-gradient(180deg, #0c0d0f 0%, #0f1013 100%)',
  night:
    'radial-gradient(ellipse 85% 52% at 68% 0%, rgba(14,20,58,0.55) 0%, transparent 60%), ' +
    'linear-gradient(180deg, #020309 0%, #030509 55%, #020308 100%)',
};

// Seeded LCG so element positions are stable across re-renders
function seeded(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function classify(condition: string, emoji: string): Condition {
  const c = condition.toLowerCase();
  const h = new Date().getHours();
  if (c.includes('thunder') || c.includes('storm')   || emoji === '⛈️')            return 'storm';
  if (c.includes('snow')    || c.includes('blizzard') || c.includes('sleet')
    || emoji === '❄️'       || emoji === '🌨️')                                      return 'snow';
  if (c.includes('rain')    || c.includes('drizzle')  || c.includes('shower')
    || emoji === '🌧️')                                                              return 'rain';
  if (c.includes('fog')     || c.includes('mist')     || c.includes('haze')
    || emoji === '🌫️')                                                              return 'fog';
  if (c.includes('overcast') || (c.includes('cloud') && !c.includes('partly')))    return 'cloudy';
  if (c.includes('partly')   || c.includes('intermittent')
    || emoji === '⛅'        || emoji === '🌤️')                                     return 'partly_cloudy';
  if (c.includes('sunny')    || c.includes('clear')   || emoji === '☀️')
    return (h >= 20 || h < 6) ? 'night' : 'sunny';
  return (h >= 20 || h < 6) ? 'night' : 'partly_cloudy';
}

// ── overlays ──────────────────────────────────────────────────────────────────

function RainLayer({ heavy = false }: { heavy?: boolean }) {
  const rand = seeded(42);
  const drops = Array.from({ length: heavy ? 60 : 42 }, (_, i) => ({
    left:  `${rand() * 100}%`,
    dur:   `${0.48 + rand() * 0.38}s`,
    delay: `-${rand() * 3}s`,
    h:     `${13 + rand() * 14}px`,
    op:    heavy ? 0.06 + rand() * 0.07 : 0.04 + rand() * 0.05,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden">
      {drops.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: d.left, top: 0,
          width: heavy ? '1.5px' : '1px', height: d.h,
          background: 'linear-gradient(to bottom, transparent, rgba(155,195,255,0.18))',
          opacity: d.op,
          animation: `wb-rain ${d.dur} ${d.delay} linear infinite`,
        }} />
      ))}
    </div>
  );
}

function SnowLayer() {
  const rand = seeded(99);
  const flakes = Array.from({ length: 34 }, (_, i) => {
    const size = 1.8 + rand() * 2.8;
    const drift = `${Math.round((rand() - 0.5) * 50)}px`;
    return {
      left: `${rand() * 100}%`,
      size, drift,
      dur:   `${7 + rand() * 9}s`,
      delay: `-${rand() * 12}s`,
      op:    0.22 + rand() * 0.28,
    };
  });
  return (
    <div className="absolute inset-0 overflow-hidden">
      {flakes.map((f, i) => (
        <div key={i} style={{
          position: 'absolute', left: f.left, top: 0,
          width: f.size, height: f.size, borderRadius: '50%',
          background: 'rgba(215, 228, 255, 0.75)',
          boxShadow: `0 0 ${f.size * 2}px rgba(215, 228, 255, 0.3)`,
          opacity: f.op,
          ['--sx' as string]: f.drift,
          animation: `wb-snow ${f.dur} ${f.delay} ease-in-out infinite`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function StarLayer() {
  const rand = seeded(7);
  const stars = Array.from({ length: 68 }, (_, i) => {
    const size = 0.8 + rand() * 1.5;
    const groups = ['wb-twinkle-a', 'wb-twinkle-b', 'wb-twinkle-c'];
    return {
      left: `${rand() * 100}%`,
      top:  `${rand() * 62}%`,
      size,
      dur:   `${2.5 + rand() * 4}s`,
      delay: `-${rand() * 6}s`,
      anim:  groups[i % 3],
    };
  });
  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <div key={i} style={{
          position: 'absolute', left: s.left, top: s.top,
          width: s.size, height: s.size, borderRadius: '50%',
          background: 'rgba(255, 242, 215, 0.9)',
          boxShadow: `0 0 ${s.size * 2.5}px rgba(255, 242, 215, 0.4)`,
          animation: `${s.anim} ${s.dur} ${s.delay} ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

function SunGlow() {
  return (
    <>
      <div style={{
        position: 'absolute', top: '-12%', left: '-6%',
        width: '45%', height: '45%', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220,128,18,0.16) 0%, rgba(200,110,12,0.06) 45%, transparent 70%)',
        animation: 'wb-sun-pulse 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '35%', height: '35%',
        background: 'radial-gradient(circle at 10% 5%, rgba(255,160,30,0.07) 0%, transparent 65%)',
      }} />
    </>
  );
}

function CloudLayer({ dim = false }: { dim?: boolean }) {
  const shapes = [
    { cx: 12,  cy: 10, rx: 24, ry: 8,  dur: '80s',  begin: '0s'   },
    { cx: 68,  cy: 7,  rx: 28, ry: 7,  dur: '105s', begin: '-32s' },
    { cx: 42,  cy: 19, rx: 19, ry: 6,  dur: '72s',  begin: '-50s' },
    { cx: 82,  cy: 14, rx: 21, ry: 8,  dur: '95s',  begin: '-18s' },
    { cx: 28,  cy: 27, rx: 17, ry: 6,  dur: '115s', begin: '-40s' },
  ];
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ opacity: dim ? 0.09 : 0.06 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {shapes.map((s, i) => (
        <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="rgba(160,170,195,0.5)">
          <animateTransform
            attributeName="transform" type="translate"
            values="-4,0; 4,0; -4,0"
            dur={s.dur} begin={s.begin} repeatCount="indefinite"
          />
        </ellipse>
      ))}
    </svg>
  );
}

function FogLayer() {
  const bands = [
    { top: '18%', dur: '11s', del: '0s',   dir: 1  },
    { top: '42%', dur: '14s', del: '-5s',  dir: -1 },
    { top: '66%', dur: '9s',  del: '-8s',  dir: 1  },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {bands.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: b.top, height: '28%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(175,185,200,0.04) 25%, rgba(175,185,200,0.07) 50%, rgba(175,185,200,0.04) 75%, transparent 100%)',
          animation: `wb-fog ${b.dur} ${b.del} ease-in-out infinite alternate`,
          ['--fog-dir' as string]: `${b.dir}`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ── keyframes ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes wb-rain {
  0%   { transform: translate(0, -6vh);   opacity: 0; }
  6%   { opacity: 1; }
  94%  { opacity: 1; }
  100% { transform: translate(9px, 106vh); opacity: 0; }
}
@keyframes wb-snow {
  0%   { transform: translate(0, -12px);                opacity: 0; }
  8%   { opacity: 1; }
  50%  { transform: translate(var(--sx, 20px), 48vh);  }
  92%  { opacity: 1; }
  100% { transform: translate(0px, 102vh);              opacity: 0; }
}
@keyframes wb-twinkle-a {
  0%, 100% { opacity: 0.12; } 50% { opacity: 0.38; }
}
@keyframes wb-twinkle-b {
  0%, 100% { opacity: 0.18; } 50% { opacity: 0.48; }
}
@keyframes wb-twinkle-c {
  0%, 100% { opacity: 0.08; } 50% { opacity: 0.26; }
}
@keyframes wb-sun-pulse {
  0%, 100% { opacity: 0.7; transform: scale(1);    }
  50%       { opacity: 1;   transform: scale(1.06); }
}
@keyframes wb-fog {
  from { transform: translateX(calc(var(--fog-dir, 1) * -7%)); }
  to   { transform: translateX(calc(var(--fog-dir, 1) *  7%)); }
}
`;

// ── main component ────────────────────────────────────────────────────────────

export default function WeatherBackground() {
  // Start at 'cloudy' (neutral dark) so a background is painted immediately
  const [condition, setCondition] = useState<Condition>('cloudy');
  const [overlayReady, setOverlayReady] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/client/quick-info/weather`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setCondition(classify(d.current.condition, d.current.emoji));
        setOverlayReady(true);
      })
      .catch(() => { /* silent — body fallback dark background covers this */ });
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -1, background: BG[condition], transition: 'background 2.5s ease' }}
    >
      <style>{KEYFRAMES}</style>

      {overlayReady && condition === 'sunny'                                      && <SunGlow />}
      {overlayReady && (condition === 'cloudy' || condition === 'partly_cloudy')  && <CloudLayer dim={condition === 'cloudy'} />}
      {overlayReady && (condition === 'rain'   || condition === 'storm')          && <RainLayer heavy={condition === 'storm'} />}
      {overlayReady && condition === 'snow'                                       && <SnowLayer />}
      {overlayReady && condition === 'night'                                      && <StarLayer />}
      {overlayReady && condition === 'fog'                                        && <FogLayer />}
    </div>
  );
}
