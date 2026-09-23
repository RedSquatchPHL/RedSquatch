'use client';

// Ported from ReactBits' BranchedMenu (src/content/Micro/BranchedMenu, MIT-ish
// open-source component library) — ported rather than installed via the
// shadcn/ReactBits MCP registry because the registry path only resolves through
// the shadcn CLI's own runtime, and this needed direct source access to swap
// its icon dependency (@hugeicons/react, not used anywhere else on this site)
// for lucide-react, which every other menu/nav component here already uses.
// SVG geometry (trunk/branch/reach path math) and the fold/marker/draw motion
// are unchanged from the original — that's the actual thing worth using.
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import './BranchedMenu.css';

export interface BranchedMenuChild {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface BranchedMenuSection {
  label: string;
  children: BranchedMenuChild[];
}

interface Props {
  items: BranchedMenuSection[];
  defaultOpen?: number | number[];
  active?: string;
  onSelect?: (value: string, item: BranchedMenuChild) => void;
  onToggle?: (index: number, isOpen: boolean) => void;
  color?: string;
  accentColor?: string;
  lineColor?: string;
  width?: number;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
}

const PAD = 6;

function toSet(open: number | number[] | undefined): Set<number> {
  return new Set(Array.isArray(open) ? open : open != null && open >= 0 ? [open] : []);
}

export default function BranchedMenu({
  items,
  defaultOpen = 0,
  active: activeProp,
  onSelect,
  onToggle,
  color = '#f5f5f5',
  accentColor = '#f5f5f5',
  lineColor = '#3f3f46',
  width = 220,
  rowHeight = 32,
  indent = 34,
  trunk = 12,
  radius = 9,
  lineWidth = 1.5,
  fontSize = 12,
  drawDuration = 380,
  foldDuration = 280,
  className = '',
}: Props) {
  const [open, setOpen] = useState<Set<number>>(() => toSet(defaultOpen));
  const [internalActive, setInternalActive] = useState<string>(() => {
    const first = items.find((it, i) => it.children && toSet(defaultOpen).has(i));
    return first?.children?.[0]?.value ?? '';
  });
  const active = activeProp ?? internalActive;
  const navRef = useRef<HTMLElement>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement>(null);
  const latest = useRef({ onSelect, onToggle });
  latest.current = { onSelect, onToggle };

  const activeSection = items.findIndex(it => it.children.some(kid => kid.value === active));
  const markerShown = activeSection >= 0 && open.has(activeSection);

  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current;
      const el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && el;
      if (!glide) m.style.transition = 'none';
      if (on && el) m.style.top = `${el.offsetTop + (el.offsetHeight - 16) / 2}px`;
      m.toggleAttribute('data-on', Boolean(on));
      if (!glide) {
        void m.offsetHeight;
        m.style.transition = '';
      }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      place(false);
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, fontSize, rowHeight]);

  function select(value: string, item: BranchedMenuChild) {
    if (activeProp === undefined) setInternalActive(value);
    latest.current.onSelect?.(value, item);
  }
  function toggle(i: number) {
    setOpen(prev => {
      const next = new Set(prev);
      const isOpen = !next.has(i);
      if (isOpen) next.add(i); else next.delete(i);
      latest.current.onToggle?.(i, isOpen);
      return next;
    });
  }

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  const style = {
    '--bm-w': `${width}px`,
    '--bm-ink': color,
    '--bm-accent': accentColor,
    '--bm-line': lineColor,
    '--bm-font': `${fontSize}px`,
    '--bm-row': `${rowHeight}px`,
    '--bm-indent': `${indent}px`,
    '--bm-line-w': lineWidth,
    '--bm-draw': `${drawDuration}ms`,
    '--bm-fold': `${foldDuration}ms`,
  } as CSSProperties;

  return (
    <nav ref={navRef} className={`branched-menu${className ? ` ${className}` : ''}`} style={style}>
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = open.has(i);
        const bodyH = PAD * 2 + kids.length * rowHeight;
        return (
          <div key={item.label} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            <button
              ref={el => { heads.current[i] = el; }}
              type="button"
              className="branched-menu__head"
              aria-expanded={isOpen}
              onClick={() => toggle(i)}
            >
              {item.label}
            </button>
            <div className="branched-menu__body">
              <div className="branched-menu__fold">
                <div className="branched-menu__tree" style={{ height: bodyH }}>
                  <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                    <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                    {kids.map((kid, k) => <path key={kid.value} className="branched-menu__base" d={branch(k)} />)}
                    {kids.map((kid, k) => (
                      <path
                        key={kid.value}
                        className="branched-menu__reach"
                        d={reach(k)}
                        style={{ strokeDasharray: length(k), strokeDashoffset: kid.value === active ? 0 : length(k) }}
                      />
                    ))}
                  </svg>
                  {kids.map(kid => {
                    const Icon = kid.icon;
                    return (
                      <button
                        key={kid.value}
                        type="button"
                        className="branched-menu__item"
                        aria-current={kid.value === active ? 'true' : undefined}
                        data-active={kid.value === active ? '' : undefined}
                        tabIndex={isOpen ? 0 : -1}
                        onClick={() => select(kid.value, kid)}
                      >
                        {Icon && <span className="branched-menu__icon" aria-hidden="true"><Icon size={13} strokeWidth={1.8} /></span>}
                        <span className="branched-menu__label">{kid.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
