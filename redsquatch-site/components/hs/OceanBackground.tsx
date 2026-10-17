'use client';

import { useEffect, useRef, useState } from 'react';
import { useHomeSquatchGate } from '@/components/HomeSquatchGate';
import { OCEAN_VS, OCEAN_FS } from '@/lib/oceanShader';
import {
  autoScene, fetchIsStorm, loadOverride, subscribeOverride, SCRIM_ALPHA, FALLBACK_GRADIENT, type Override,
} from '@/lib/oceanScene';

// HomeSquatch background: the raymarched ocean, fixed behind everything.
// The scene follows the Work/Downtime gate (+ real thunderstorms) or the manual
// override in the header. Renders at reduced resolution, caps at 30fps, and backs
// off further if the GPU struggles. Reduced-motion users get one still frame.
const FPS_CAP = 30;
const Q_MIN = 0.4;
const Q_MAX = 0.9;
const Q_START = 0.7;
const TWEEN_RATE = 1.1;   // spring rate for adjacent-scene blends (~3s)
const FADE_MS = 650;      // fade-through for non-adjacent jumps

function useScene(): number {
  const { mode, phase } = useHomeSquatchGate();
  const [override, setOverride] = useState<Override>('auto');
  const [hour, setHour] = useState(12);
  const [storm, setStorm] = useState(false);

  useEffect(() => {
    setOverride(loadOverride());
    return subscribeOverride(setOverride);
  }, []);

  useEffect(() => {
    const tick = () => { const d = new Date(); setHour(d.getHours() + d.getMinutes() / 60); };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let live = true;
    const check = () => fetchIsStorm().then(v => { if (live) setStorm(v); });
    check();
    const id = setInterval(check, 15 * 60_000);
    return () => { live = false; clearInterval(id); };
  }, []);

  return override === 'auto' ? autoScene(mode, phase, hour, storm) : override;
}

export default function OceanBackground() {
  const scene = useScene();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(scene);
  const [fallback, setFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { sceneRef.current = scene; }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: 'low-power',
    });
    if (!gl) { setFallback(true); return; }

    const mk = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh)); return null; }
      return sh;
    };
    const vs = mk(gl.VERTEX_SHADER, OCEAN_VS);
    const fs = mk(gl.FRAGMENT_SHADER, OCEAN_FS);
    const prog = gl.createProgram()!;
    if (!vs || !fs) { setFallback(true); return; }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); setFallback(true); return; }
    gl.useProgram(prog);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.disable(gl.DITHER);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(ap);
    gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

    const uR = gl.getUniformLocation(prog, 'uR');
    const uT = gl.getUniformLocation(prog, 'uT');
    const uS = gl.getUniformLocation(prog, 'uS');
    const uSc = gl.getUniformLocation(prog, 'uSc');
    const uBl = gl.getUniformLocation(prog, 'uBl');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let q = Q_START;
    let s = sceneRef.current / 5;          // shader scroll-progress; scene k sits at k/5
    let fadeUntil = 0;                      // timestamp when a fade-through jump completes
    let pendingS: number | null = null;
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    let fpsAcc = 0, fpsFrames = 0, lowWin = 0, highWin = 0;
    let dead = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      const w = Math.max(2, Math.round(window.innerWidth * dpr * q));
      const h = Math.max(2, Math.round(window.innerHeight * dpr * q));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uR, w, h);
      }
    };

    const draw = (tSec: number) => {
      const raw = Math.min(5, s * 5 + 1e-4);
      const si = Math.min(4, Math.floor(raw));
      gl.uniform1f(uT, tSec);
      gl.uniform1f(uS, s);
      gl.uniform1f(uSc, si);
      gl.uniform1f(uBl, raw - si);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frame = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / FPS_CAP - 1) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // adaptive resolution
      fpsAcc += dt; fpsFrames++;
      if (fpsAcc >= 1) {
        const fps = fpsFrames / fpsAcc;
        fpsAcc = 0; fpsFrames = 0;
        if (fps < 24) { lowWin++; highWin = 0; } else if (fps > 29) { highWin++; lowWin = 0; } else { lowWin = 0; highWin = 0; }
        if (lowWin >= 2 && q > Q_MIN) { q = Math.max(Q_MIN, +(q - 0.1).toFixed(2)); lowWin = 0; resize(); }
        if (highWin >= 5 && q < Q_MAX) { q = Math.min(Q_MAX, +(q + 0.05).toFixed(2)); highWin = 0; resize(); }
      }

      // scene changes: blend between adjacent scenes, fade-through otherwise
      const targetK = sceneRef.current;
      const shownK = Math.round(s * 5);
      if (pendingS !== null) {
        if (now >= fadeUntil) { s = pendingS; pendingS = null; canvas.style.opacity = '1'; }
      } else if (Math.abs(targetK - s * 5) > 0.002) {
        if (Math.abs(targetK - shownK) <= 1) {
          s += (targetK / 5 - s) * (1 - Math.exp(-dt * TWEEN_RATE));
        } else {
          pendingS = targetK / 5;
          fadeUntil = now + FADE_MS;
          canvas.style.opacity = '0';
        }
      }
      draw((now - t0) / 1000);
    };

    const onResize = () => { resize(); if (reduce) draw(30); };
    const onLost = (e: Event) => { e.preventDefault(); dead = true; cancelAnimationFrame(raf); setFallback(true); };
    const onRestored = () => { setFallback(false); setNonce(n => n + 1); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    window.addEventListener('resize', onResize, { passive: true });

    resize();
    if (reduce) {
      draw(30);
    } else {
      raf = requestAnimationFrame(frame);
    }

    // reduced motion: no loop, so jump straight to a new scene when it changes
    const stillTimer = reduce ? setInterval(() => {
      const target = sceneRef.current / 5;
      if (Math.abs(target - s) > 1e-4) { s = target; draw(30); }
    }, 500) : 0;

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (stillTimer) clearInterval(stillTimer);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      // Free GL objects but leave the context alone: the canvas outlives this effect
      // (React strict mode re-runs it on the same canvas), and a force-lost context
      // can't be reused.
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, [nonce]);

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: fallback ? FALLBACK_GRADIENT[scene] : '#0a0a0f',
          transition: 'background 1.5s ease',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block', width: '100%', height: '100%',
            visibility: fallback ? 'hidden' : 'visible', transition: `opacity ${FADE_MS}ms ease`,
          }}
        />
      </div>
      {/* readability scrim: tinted per scene, plus a fixed bottom vignette */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundColor: `rgba(0,0,8,${SCRIM_ALPHA[scene]})`,
          backgroundImage: 'linear-gradient(to top, rgba(0,0,8,0.32) 0%, transparent 45%)',
          transition: 'background-color 1.5s ease',
        }}
      />
    </>
  );
}
