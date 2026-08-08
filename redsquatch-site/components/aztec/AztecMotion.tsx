'use client';

import { useEffect } from 'react';

interface AztecMotionProps {
  marqueeItems: string[];
}

/**
 * Mounts the ambient/interactive layer for the Aztec Command Center reskin:
 * cursor, aurora + noise backdrop, ambient spotlight, panel tilt-on-hover,
 * staggered entrance for anything marked `[data-stagger]`, and the marquee.
 *
 * Scoped deliberately smaller than the design-preview mockup this was built
 * from — magnetic buttons, the glitch-flicker hover, and JS counters were
 * flourishes for elements (a "Deploy" CTA, fabricated stats) that don't
 * exist on this real page. What's here is the structural/atmospheric layer:
 * the part that's actually "this page's chrome," not per-widget decoration.
 *
 * Mount this only once the real panels are in the DOM (i.e. after loading
 * finishes) — it queries `.ac-panel` / `.ac-grid` on mount and won't pick up
 * elements that appear later.
 */
export default function AztecMotion({ marqueeItems }: AztecMotionProps) {
  useEffect(() => {
    const root = document.querySelector('.aztec-command');
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const noHover = window.matchMedia('(hover: none)').matches;
    const cleanups: Array<() => void> = [];

    /* ---- custom cursor ---- */
    const dot = document.getElementById('ac-cursor-dot');
    const ring = document.getElementById('ac-cursor-ring');
    if (!reduced && !noHover && dot && ring) {
      root.classList.add('ac-custom-cursor');
      let rx = 0, ry = 0, mx = 0, my = 0;
      const onMove = (e: MouseEvent) => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px';
        dot.style.top = my + 'px';
      };
      document.addEventListener('mousemove', onMove);
      cleanups.push(() => document.removeEventListener('mousemove', onMove));

      let raf = 0;
      const lerpRing = () => {
        rx += (mx - rx) * 0.14;
        ry += (my - ry) * 0.14;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        raf = requestAnimationFrame(lerpRing);
      };
      raf = requestAnimationFrame(lerpRing);
      cleanups.push(() => cancelAnimationFrame(raf));
    } else {
      if (dot) dot.style.display = 'none';
      if (ring) ring.style.display = 'none';
    }

    /* ---- marquee ---- */
    const track = document.getElementById('ac-marquee');
    if (track) {
      const make = () =>
        marqueeItems
          .map((t) => `<span class="ac-marquee-item">${t}</span><span class="ac-marquee-sep">▲</span>`)
          .join('');
      track.innerHTML = make() + make();
    }

    /* ---- panel tilt ---- */
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.ac-panel'));
    if (!reduced) {
      panels.forEach((panel) => {
        let moving = false;
        const onEnter = () => { moving = true; };
        const onLeave = () => {
          moving = false;
          panel.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        };
        const onMoveP = (e: MouseEvent) => {
          if (!moving) return;
          const rect = panel.getBoundingClientRect();
          const cx = rect.width / 2, cy = rect.height / 2;
          const x = e.clientX - rect.left - cx;
          const y = e.clientY - rect.top - cy;
          const rotateY = (x / cx) * 6;
          const rotateX = -(y / cy) * 6;
          panel.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
        };
        panel.addEventListener('mouseenter', onEnter);
        panel.addEventListener('mouseleave', onLeave);
        panel.addEventListener('mousemove', onMoveP);
        cleanups.push(() => {
          panel.removeEventListener('mouseenter', onEnter);
          panel.removeEventListener('mouseleave', onLeave);
          panel.removeEventListener('mousemove', onMoveP);
        });
      });
    }

    /* ---- staggered entrance ---- */
    const grid = document.querySelector('.ac-grid');
    if (grid && !reduced) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const cards = entry.target.querySelectorAll<HTMLElement>('[data-stagger]');
            cards.forEach((card, idx) => {
              const delay = idx * 90;
              card.style.opacity = '0';
              card.style.transform = 'translateY(20px)';
              card.style.transition = `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`;
              requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
              });
            });
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(grid);
      cleanups.push(() => observer.disconnect());
    }

    /* ---- ambient spotlight ---- */
    const canvas = document.getElementById('ac-spotlight') as HTMLCanvasElement | null;
    if (canvas && !reduced) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let slx = -999, sly = -999;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        const onMoveW = (e: MouseEvent) => { slx = e.clientX; sly = e.clientY; };
        const onLeaveW = () => { slx = -999; sly = -999; };
        window.addEventListener('mousemove', onMoveW);
        window.addEventListener('mouseleave', onLeaveW);

        let raf2 = 0;
        const draw = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (slx !== -999) {
            const g = ctx.createRadialGradient(slx, sly, 0, slx, sly, 320);
            g.addColorStop(0, 'rgba(212,163,115,.07)');
            g.addColorStop(0.5, 'rgba(26,92,74,.04)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          raf2 = requestAnimationFrame(draw);
        };
        raf2 = requestAnimationFrame(draw);

        cleanups.push(() => {
          window.removeEventListener('resize', resize);
          window.removeEventListener('mousemove', onMoveW);
          window.removeEventListener('mouseleave', onLeaveW);
          cancelAnimationFrame(raf2);
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div id="ac-cursor-dot">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M22.0,15.3 L31.0,16.0 L22.0,16.7 Z M16.7,22.0 L16.0,31.0 L15.3,22.0 Z M10.0,16.7 L1.0,16.0 L10.0,15.3 Z M15.3,10.0 L16.0,1.0 L16.7,10.0 Z"
            fill="currentColor"
          />
          <path
            d="M20.6,20.6 L24.5,24.5 M11.4,20.6 L7.5,24.5 M11.4,11.4 L7.5,7.5 M20.6,11.4 L24.5,7.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div id="ac-cursor-ring" />
      <div className="ac-aurora" aria-hidden="true">
        <div className="ac-aurora-blob" />
        <div className="ac-aurora-blob" />
        <div className="ac-aurora-blob" />
      </div>
      <div className="ac-noise" aria-hidden="true" />
      <canvas id="ac-spotlight" aria-hidden="true" />
    </>
  );
}
