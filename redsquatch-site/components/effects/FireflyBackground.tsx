'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const GLOW_COLOR = '255, 200, 70'; // matches MagicBento amber-gold
const COUNT      = 26;

function makeFirefly(x: number, y: number): HTMLDivElement {
  const el   = document.createElement('div');
  const size = 4 + Math.random() * 4;
  el.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(${GLOW_COLOR},1) 0%, rgba(${GLOW_COLOR},0.5) 40%, transparent 70%);
    box-shadow:
      0 0 ${size * 1.5}px rgba(${GLOW_COLOR},1),
      0 0 ${size * 4}px   rgba(${GLOW_COLOR},0.55),
      0 0 ${size * 9}px   rgba(${GLOW_COLOR},0.25),
      0 0 ${size * 16}px  rgba(${GLOW_COLOR},0.08);
    pointer-events: none;
    left: ${x}px;
    top:  ${y}px;
  `;
  return el;
}

export default function FireflyBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const particles: HTMLDivElement[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < COUNT; i++) {
      const delay = i * 190 + Math.random() * 140;
      const id = setTimeout(() => {
        if (!containerRef.current) return;

        const x = Math.random() * W;
        const y = Math.random() * H;
        const p = makeFirefly(x, y);
        container.appendChild(p);
        particles.push(p);

        // Soft emergence
        gsap.fromTo(p,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 0.8 + Math.random() * 0.2, duration: 1.4 + Math.random() * 0.8, ease: 'power1.out' }
        );

        // Horizontal drift
        gsap.to(p, {
          x: (Math.random() - 0.5) * 80,
          duration: 3.5 + Math.random() * 4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 2,
        });

        // Vertical drift — upward bias matches real firefly behaviour
        gsap.to(p, {
          y: -(20 + Math.random() * 42),
          duration: 4.5 + Math.random() * 4.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 2.5,
        });

        // Bioluminescent blink
        gsap.to(p, {
          opacity: 0.03 + Math.random() * 0.16,
          duration: 0.7 + Math.random() * 1.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: Math.random() * 4,
        });
      }, delay);

      timeouts.push(id);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      particles.forEach(p => {
        gsap.killTweensOf(p);
        p.parentNode?.removeChild(p);
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  );
}
