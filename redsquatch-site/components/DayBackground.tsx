'use client';
import { useEffect, useRef } from 'react';
import type { Season } from './ThemeContext';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  phase: number; rot: number; rotSpd: number;
}

const CFG = {
  summer: { n: 22, r: 255, g: 250, b: 210 }, // warm white-gold dandelion seeds
  spring: { n: 20, r: 255, g: 172, b: 188 }, // cherry blossom pink
  fall:   { n: 22, r: 200, g: 108, b: 26  }, // amber-rust leaf
  winter: { n: 26, r: 195, g: 215, b: 255 }, // ice blue snowflake
} as const;

export default function DayBackground({ season }: { season: Season }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { n, r, g, b } = CFG[season];
    const isFall   = season === 'fall';
    const isWinter = season === 'winter';
    const isSummer = season === 'summer';

    let raf: number;
    let W = 0, H = 0;
    let particles: Particle[] = [];

    function mk(): Particle {
      const minS = isFall ? 5 : isWinter ? 2 : 3;
      const maxS = isFall ? 11 : isWinter ? 5 : 8;
      return {
        x:       Math.random() * W,
        y:       Math.random() * H,
        vx:      (Math.random() - 0.5) * 0.32,
        vy:      isFall ? 0.5 + Math.random() * 0.65 : -(0.32 + Math.random() * 0.62),
        size:    minS + Math.random() * (maxS - minS),
        opacity: 0.42 + Math.random() * 0.45,
        phase:   Math.random() * Math.PI * 2,
        rot:     Math.random() * Math.PI * 2,
        rotSpd:  (Math.random() - 0.5) * 0.028,
      };
    }

    function resize() {
      W = canvas!.width  = window.innerWidth;
      H = canvas!.height = window.innerHeight;
      particles = Array.from({ length: n }, mk);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    const t0 = performance.now();

    function draw(now: number) {
      const t = (now - t0) / 1000;
      ctx!.clearRect(0, 0, W, H);

      for (const p of particles) {
        const sway = Math.sin(t * 0.42 + p.phase) * 0.12;
        p.x   += p.vx + sway;
        p.y   += p.vy;
        p.rot += p.rotSpd;

        // Respawn at opposite edge
        if (isFall) {
          if (p.y > H + 16) { p.y = -16; p.x = Math.random() * W; }
        } else {
          if (p.y < -16) { p.y = H + 16; p.x = Math.random() * W; }
        }
        if (p.x < -16) p.x = W + 16;
        if (p.x > W + 16) p.x = -16;

        const op = p.opacity * (0.58 + 0.42 * Math.sin(t * 0.32 + p.phase));

        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);

        if (isWinter) {
          // Snowflake — three intersecting lines forming a 6-point star
          ctx!.strokeStyle = `rgba(${r},${g},${b},${op})`;
          ctx!.lineWidth   = 0.8;
          for (let i = 0; i < 3; i++) {
            ctx!.beginPath();
            ctx!.moveTo(-p.size, 0);
            ctx!.lineTo(p.size, 0);
            ctx!.stroke();
            ctx!.rotate(Math.PI / 3);
          }
        } else if (isFall) {
          // Leaf — rotated ellipse with slight crinkle
          ctx!.beginPath();
          ctx!.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${r},${g},${b},${op})`;
          ctx!.fill();
          // Leaf vein
          ctx!.strokeStyle = `rgba(${r},${g},${b},${op * 0.35})`;
          ctx!.lineWidth   = 0.5;
          ctx!.beginPath();
          ctx!.moveTo(-p.size * 0.8, 0);
          ctx!.lineTo(p.size * 0.8, 0);
          ctx!.stroke();
        } else {
          // Soft petal / dandelion seed — radial gradient orb
          const grad = ctx!.createRadialGradient(0, 0, 0, 0, 0, p.size);
          grad.addColorStop(0,   `rgba(${r},${g},${b},${op})`);
          grad.addColorStop(0.65, `rgba(${r},${g},${b},${op * 0.32})`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx!.fillStyle = grad;
          ctx!.fill();

          // Dandelion: wispy stem below the seed head
          if (isSummer) {
            ctx!.strokeStyle = `rgba(${r},${g},${b},${op * 0.45})`;
            ctx!.lineWidth   = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(0, 0);
            ctx!.lineTo(0, p.size * 1.9);
            ctx!.stroke();
          }
        }

        ctx!.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [season]);

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
