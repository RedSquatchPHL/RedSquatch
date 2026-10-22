'use client';

import { useEffect, useRef } from 'react';
import {
  KEYS, loadOverride, subscribeOverride, targetPalette, type Override, type Pal, type RGB,
} from '@/lib/oceanScene';
import { loadBeach } from '@/lib/hsBand';

// HomeSquatch background: a painted 2D-canvas ocean, fixed behind everything.
// Port of "TIDES – A Cinematic Canvas Ocean" by Chathura-Jayasanka
// (codepen.io/Chathura-Jayasanka/pen/emBMYWJ). Light by design: flat vector
// fills (no per-pixel shading), CSS-pixel resolution, 30fps cap, an automatic
// resolution back-off, paused in hidden tabs, one still frame for reduced motion.
const FPS_CAP = 30;
const Q_MIN = 0.5;
const SWELLS = 26;
const NUM_STARS = 140;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function clonePal(p: Pal): Pal {
  return { ...p, skyTop: [...p.skyTop], skyHor: [...p.skyHor], sun: [...p.sun], glow: [...p.glow], wFar: [...p.wFar], wNear: [...p.wNear], foam: [...p.foam] };
}

// ease `cur` toward `tgt` in place (palette changes crossfade over ~2s)
function easePal(cur: Pal, tgt: Pal, f: number) {
  for (const k of ['skyTop', 'skyHor', 'sun', 'glow', 'wFar', 'wNear', 'foam'] as const) {
    for (let i = 0; i < 3; i++) cur[k][i] += (tgt[k][i] - cur[k][i]) * f;
  }
  for (const k of ['sunH', 'glit', 'star', 'scrim'] as const) cur[k] += (tgt[k] - cur[k]) * f;
}

export default function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overrideRef = useRef<Override>('auto');
  // Beach theme is light, so it needs far less of the dark readability scrim by day.
  const beachRef = useRef(false);

  useEffect(() => {
    overrideRef.current = loadOverride();
    beachRef.current = loadBeach();
    const onBeach = (e: Event) => { beachRef.current = (e as CustomEvent<boolean>).detail; };
    window.addEventListener('rs-hs-beach', onBeach);
    const unsub = subscribeOverride(o => { overrideRef.current = o; });
    return () => { unsub(); window.removeEventListener('rs-hs-beach', onBeach); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, horizonY = 0, oceanH = 0, step = 6;
    let q = 1;
    let ys = new Float32Array(1);

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      horizonY = H * 0.42; oceanH = H - horizonY;
      step = Math.max(6, Math.round(W / 220));      // fewer vertices on wide screens
      const n = Math.ceil(W / step) + 2;
      if (ys.length < n) ys = new Float32Array(n);
      const w = Math.max(2, Math.round(W * q)), h = Math.max(2, Math.round(H * q));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(q, 0, 0, q, 0, 0);
    };

    const stars = Array.from({ length: NUM_STARS }, () => ({ x: Math.random(), y: Math.random() * 0.4, r: Math.random() * 1.2 + 0.3, tw: Math.random() * Math.PI * 2 }));
    const clouds = Array.from({ length: 5 }, () => ({ x: Math.random(), y: 0.08 + Math.random() * 0.18, w: 0.18 + Math.random() * 0.22, speed: 0.000015 + Math.random() * 0.00002 }));
    const birds = Array.from({ length: 4 }, () => ({ x: Math.random(), y: 0.15 + Math.random() * 0.18, speed: 0.00004 + Math.random() * 0.00004, size: 8 + Math.random() * 6, flap: Math.random() * Math.PI * 2 }));

    let mouseX = 0.5;
    const onMove = (e: MouseEvent) => { mouseX = e.clientX / (W || 1); };

    let T = 6;
    const P = clonePal(targetPalette(overrideRef.current, new Date()));

    const draw = (dt: number) => {
      T += dt * 0.96;
      const frames = dt * 60;                        // pen speeds are per-frame at 60fps
      easePal(P, targetPalette(overrideRef.current, new Date()), 1 - Math.exp(-dt * 1.5));

      const sunX = W * (0.5 + (mouseX - 0.5) * 0.25);
      const sunY = horizonY - P.sunH * horizonY * 0.82;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, horizonY + oceanH * 0.1);
      sky.addColorStop(0, rgb(P.skyTop));
      sky.addColorStop(0.7, rgb(lerpRGB(P.skyTop, P.skyHor, 0.55)));
      sky.addColorStop(1, rgb(P.skyHor));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, horizonY + 2);

      // stars
      if (P.star > 0.01) {
        for (const s of stars) {
          const tw = 0.5 + 0.5 * Math.sin(T * 2 + s.tw);
          ctx.fillStyle = `rgba(255,255,255,${P.star * tw * 0.9})`;
          ctx.beginPath(); ctx.arc(s.x * W, s.y * horizonY, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      // sun glow + disc
      const glowR = Math.min(W, H) * 0.5;
      const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowR);
      g.addColorStop(0, rgb(P.glow, 0.55)); g.addColorStop(0.25, rgb(P.glow, 0.22)); g.addColorStop(1, rgb(P.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizonY + oceanH * 0.4);
      const sunR = Math.min(W, H) * 0.045;
      const sd = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
      sd.addColorStop(0, rgb(P.sun, 1)); sd.addColorStop(0.7, rgb(P.sun, 0.95)); sd.addColorStop(1, rgb(P.sun, 0.2));
      ctx.fillStyle = sd; ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

      // clouds
      ctx.fillStyle = rgb(lerpRGB(P.skyHor, [255, 255, 255], 0.25), 0.16);
      for (const c of clouds) {
        c.x += c.speed * frames; if (c.x > 1.3) c.x = -0.3;
        const cx = c.x * W, cy = c.y * horizonY, cw = c.w * W;
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.ellipse(cx + j * cw * 0.22, cy + Math.sin(j) * 6, cw * (0.3 - j * 0.04), cw * 0.06, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // birds
      ctx.strokeStyle = rgb(lerpRGB(P.skyTop, [0, 0, 0], 0.3), 0.5);
      ctx.lineWidth = 1.5;
      for (const b of birds) {
        b.x += b.speed * frames; b.flap += 0.15 * frames;
        if (b.x > 1.2) { b.x = -0.2; b.y = 0.15 + Math.random() * 0.18; }
        const bx = b.x * W, by = b.y * horizonY, wing = Math.sin(b.flap) * b.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx - b.size, by + wing);
        ctx.quadraticCurveTo(bx, by - b.size * 0.3, bx, by);
        ctx.quadraticCurveTo(bx, by - b.size * 0.3, bx + b.size, by + wing);
        ctx.stroke();
      }

      // horizon haze
      const haze = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 40);
      haze.addColorStop(0, rgb(P.skyHor, 0)); haze.addColorStop(0.5, rgb(P.skyHor, 0.45)); haze.addColorStop(1, rgb(P.wFar, 0));
      ctx.fillStyle = haze; ctx.fillRect(0, horizonY - 40, W, 80);

      // swells, back -> front. Wave height is computed once per band and reused.
      const n = Math.ceil(W / step) + 1;                  // last vertex lands at or past the right edge
      for (let i = 0; i < SWELLS; i++) {
        const depth = i / (SWELLS - 1);
        const yTop = horizonY + Math.pow(depth, 1.9) * oceanH;
        const amp = lerp(0.6, 30, depth);
        const wlen = lerp(46, 340, depth);
        const phase = T * lerp(0.25, 0.9, depth) + i * 0.9;
        const col = lerpRGB(P.wFar, P.wNear, depth);

        for (let k = 0; k < n; k++) {
          const x = k * step;
          ys[k] = yTop + Math.sin(x / wlen + phase) * amp + Math.sin(x / (wlen * 0.4) + phase * 1.6) * amp * 0.3;
        }

        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let k = 0; k < n; k++) ctx.lineTo(k * step, ys[k]);
        ctx.lineTo((n - 1) * step, H);
        ctx.closePath();
        ctx.fillStyle = rgb(col);
        ctx.fill();

        ctx.lineWidth = lerp(0.6, 2.2, depth);
        ctx.beginPath();
        ctx.moveTo(0, ys[0]);
        for (let k = 1; k < n; k++) ctx.lineTo(k * step, ys[k]);
        ctx.strokeStyle = rgb(lerpRGB(col, P.sun, 0.55), lerp(0.05, 0.3, depth));
        ctx.stroke();

        if (depth > 0.62) {                          // foam on the front swells
          const foamA = (depth - 0.62) / 0.38;
          for (let k = 0; k < n; k += 2) {
            const x = k * step;
            if (Math.sin(x / wlen + phase) > 0.55 && Math.random() > 0.35) {
              ctx.fillStyle = rgb(P.foam, foamA * (0.18 + Math.random() * 0.35));
              ctx.fillRect(x + (Math.random() - 0.5) * 6, ys[k] - Math.random() * 3, 1.5 + Math.random() * 3, 1.5 + Math.random() * 2);
            }
          }
        }
      }

      // sun glitter path
      for (let i = 0; i < 220; i++) {
        const dy = Math.random();
        const y = horizonY + Math.pow(dy, 1.5) * oceanH;
        const spread = lerp(6, W * 0.3, dy);
        const x = sunX + (Math.random() - 0.5) * 2 * spread;
        const distFade = 1 - Math.min(1, Math.abs(x - sunX) / (spread + 1));
        const a = distFade * distFade * (0.25 + Math.random() * 0.75) * P.glit * (1 - dy * 0.25);
        if (a < 0.02) continue;
        ctx.fillStyle = rgb(P.sun, a * 0.85);
        ctx.fillRect(x, y, 1 + Math.random() * (2 + dy * 4), 1 + dy);
      }

      // vignette + readability scrim (UI text sits on top of this)
      const vig = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.9);
      // Beach theme: keep the scene bright by day (k -> 0.25), full scrim once the stars are out.
      const k = beachRef.current ? 0.25 + 0.75 * Math.min(1, P.star) : 1;
      vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, `rgba(0,0,8,${0.34 * k})`);
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,8,${P.scrim * k})`; ctx.fillRect(0, 0, W, H);
    };

    resize();
    window.addEventListener('resize', onResizeWrap, { passive: true });
    function onResizeWrap() { resize(); if (reduce) draw(0); }

    let raf = 0, last = performance.now(), fpsAcc = 0, fpsFrames = 0, lowWin = 0, highWin = 0, dead = false, stillTimer = 0;

    if (reduce) {
      draw(0);
      stillTimer = window.setInterval(() => draw(0), 60_000);          // follow the clock slowly
      const unsub = subscribeOverride(() => { easePal(P, targetPalette(overrideRef.current, new Date()), 1); draw(0); });
      return () => { dead = true; clearInterval(stillTimer); unsub(); window.removeEventListener('resize', onResizeWrap); };
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    const frame = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS_CAP - 1) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      fpsAcc += dt; fpsFrames++;
      if (fpsAcc >= 1) {
        const fps = fpsFrames / fpsAcc;
        fpsAcc = 0; fpsFrames = 0;
        if (fps < 24) { lowWin++; highWin = 0; } else if (fps > 29) { highWin++; lowWin = 0; } else { lowWin = 0; highWin = 0; }
        if (lowWin >= 2 && q > Q_MIN) { q = Math.max(Q_MIN, +(q - 0.1).toFixed(2)); lowWin = 0; resize(); }
        if (highWin >= 8 && q < 1) { q = Math.min(1, +(q + 0.05).toFixed(2)); highWin = 0; resize(); }
      }
      draw(dt);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResizeWrap);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block', background: '#06080f' }}
    />
  );
}
