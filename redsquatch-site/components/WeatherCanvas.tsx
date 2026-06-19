'use client';

import { useEffect, useRef } from 'react';

type Effect = 'rain' | 'storm' | 'snow' | 'fog' | 'none';

function detectEffect(condition: string): Effect {
  const c = condition.toLowerCase();
  if (c.includes('thunder') || c.includes('storm'))                              return 'storm';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower'))      return 'rain';
  if (c.includes('snow') || c.includes('sleet') || c.includes('blizzard') || c.includes('flurr')) return 'snow';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze'))            return 'fog';
  return 'none';
}

interface Drop  { x: number; y: number; speed: number; len: number; opacity: number }
interface Flake { x: number; y: number; r: number; speed: number; drift: number; phase: number; opacity: number }
interface Blob  { x: number; y: number; rx: number; ry: number; speed: number; opacity: number; phase: number }

export default function WeatherCanvas({
  condition,
  className,
  style,
}: {
  condition: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effect    = detectEffect(condition);

  useEffect(() => {
    if (effect === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let t   = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = canvas.offsetWidth  || 300;
      canvas.height = canvas.offsetHeight || 200;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const W = () => canvas!.width;
    const H = () => canvas!.height;

    // ── Rain / Storm ──────────────────────────────────────────────────────
    if (effect === 'rain' || effect === 'storm') {
      const count = effect === 'storm' ? 110 : 65;
      const drops: Drop[] = Array.from({ length: count }, () => ({
        x:       Math.random() * (400 + 40) - 20,
        y:       Math.random() * 300,
        speed:   6 + Math.random() * 7,
        len:     10 + Math.random() * 16,
        opacity: 0.2 + Math.random() * 0.35,
      }));
      let flash = 0;

      const tick = () => {
        ctx.clearRect(0, 0, W(), H());

        if (effect === 'storm') {
          flash = Math.max(0, flash - 0.04);
          if (Math.random() < 0.003) flash = 0.85 + Math.random() * 0.15;
          if (flash > 0) {
            ctx.fillStyle = `rgba(200, 220, 255, ${flash * 0.13})`;
            ctx.fillRect(0, 0, W(), H());
          }
        }

        ctx.lineWidth   = 1;
        ctx.strokeStyle = '#a0c8ff';

        drops.forEach(d => {
          ctx.globalAlpha = d.opacity;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * 0.2, d.y + d.len);
          ctx.stroke();
          d.x -= d.speed * 0.2;
          d.y += d.speed;
          if (d.y > H() + d.len) {
            d.y = -d.len;
            d.x = Math.random() * (W() + 40) - 20;
          }
        });

        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ── Snow ──────────────────────────────────────────────────────────────
    else if (effect === 'snow') {
      const flakes: Flake[] = Array.from({ length: 75 }, () => ({
        x:       Math.random() * 400,
        y:       Math.random() * 300,
        r:       1.2 + Math.random() * 2.8,
        speed:   0.4 + Math.random() * 1.0,
        drift:   (Math.random() - 0.5) * 0.6,
        phase:   Math.random() * Math.PI * 2,
        opacity: 0.55 + Math.random() * 0.4,
      }));

      const tick = () => {
        ctx.clearRect(0, 0, W(), H());
        t += 0.008;

        flakes.forEach(f => {
          ctx.globalAlpha = f.opacity;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = '#dceeff';
          ctx.fill();
          f.y += f.speed;
          f.x += f.drift + Math.sin(t + f.phase) * 0.35;
          if (f.y > H() + f.r) { f.y = -f.r; f.x = Math.random() * W(); }
          if (f.x > W() + 10) f.x = -10;
          if (f.x < -10)      f.x = W() + 10;
        });

        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    // ── Fog ───────────────────────────────────────────────────────────────
    else if (effect === 'fog') {
      const blobs: Blob[] = Array.from({ length: 7 }, (_, i) => ({
        x:       ((i / 7) * 560) - 80,
        y:       50 + Math.random() * 200,
        rx:      90  + Math.random() * 110,
        ry:      30  + Math.random() * 50,
        speed:   0.12 + Math.random() * 0.22,
        opacity: 0.055 + Math.random() * 0.07,
        phase:   Math.random() * Math.PI * 2,
      }));

      const tick = () => {
        ctx.clearRect(0, 0, W(), H());
        t += 0.004;

        blobs.forEach(b => {
          const cy = b.y + Math.sin(t + b.phase) * 7;
          const grad = ctx.createRadialGradient(b.x, cy, 0, b.x, cy, b.rx);
          grad.addColorStop(0, `rgba(200, 205, 215, ${b.opacity})`);
          grad.addColorStop(1, 'rgba(200, 205, 215, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(b.x, cy, b.rx, b.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          b.x += b.speed;
          if (b.x > W() + b.rx) b.x = -b.rx;
        });

        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [effect]);

  if (effect === 'none') return null;

  return <canvas ref={canvasRef} className={className} style={style} />;
}
