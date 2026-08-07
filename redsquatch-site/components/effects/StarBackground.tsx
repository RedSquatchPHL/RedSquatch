'use client';
import { useEffect, useRef } from 'react';

interface Star {
  x: number; y: number; r: number;
  baseOp: number; speed: number; phase: number;
}

const COUNT = 130;

export default function StarBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let stars: Star[] = [];

    function populate(w: number, h: number) {
      stars = Array.from({ length: COUNT }, () => ({
        x:      Math.random() * w,
        y:      Math.random() * h * 0.88, // keep stars in upper portion
        r:      0.5 + Math.random() * 1.4,
        baseOp: 0.20 + Math.random() * 0.60,
        speed:  0.22 + Math.random() * 0.75,
        phase:  Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
      populate(canvas!.width, canvas!.height);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    const t0 = performance.now();

    function draw(now: number) {
      const t = (now - t0) / 1000;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const s of stars) {
        const op = s.baseOp * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,245,220,${op})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  );
}
