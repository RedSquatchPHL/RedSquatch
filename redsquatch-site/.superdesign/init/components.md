# Components — shared UI primitives (WS command-center system)

## CopperPanel
- File: `components/cenote/CopperPanel.tsx`
- Angular clip-path card, title/subtitle/subtext slots, wraps arbitrary children.
```tsx
'use client';

import { ReactNode } from 'react';
import styles from './copper-panel.module.css';

interface CopperPanelProps {
  title?: string;
  subtitle?: string;
  subtext?: string;
  children?: ReactNode;
}

export default function CopperPanel({ title, subtitle, subtext, children }: CopperPanelProps) {
  return (
    <section className={styles.copperPanel}>
      {title && <div className={styles.title}>{title}</div>}
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {subtext && <div className={styles.subtext}>{subtext}</div>}

      <div className={styles.content}>{children}</div>
    </section>
  );
}
```
(CSS: see `theme.md`.)

## StoneTile
- File: `components/cenote/StoneTile.tsx`
- Icon + title/subtitle tile. Active tiles use `.lit-tile` + larger icon; inactive use `.stone-tile`. Optional `href` renders as a `next/link` nav item (used for the WS dashboard's left rail: Goals/Sports/Tools).
```tsx
'use client';

import Link from 'next/link';
import {
  Signal, Mic2, ThermometerSun, Clock, AlertCircle, CheckCircle,
  Power, ShieldCheck, BellOff, HardDrive, MapPin, Navigation2,
  Compass, Lock, RadioReceiver, Target, Activity, Wrench, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  'lucide:signal': Signal, 'lucide:mic-2': Mic2, 'lucide:thermometer-sun': ThermometerSun,
  'lucide:clock': Clock, 'lucide:alert-circle': AlertCircle, 'lucide:check-circle': CheckCircle,
  'lucide:power': Power, 'lucide:shield-check': ShieldCheck, 'lucide:bell-off': BellOff,
  'lucide:hard-drive': HardDrive, 'lucide:map-pin': MapPin, 'lucide:navigation-2': Navigation2,
  'lucide:compass': Compass, 'lucide:lock': Lock, 'lucide:antenna': RadioReceiver,
  'lucide:target': Target, 'lucide:activity': Activity, 'lucide:wrench': Wrench,
};

interface StoneTileProps {
  isActive: boolean;
  icon: string;
  title: string;
  subtitle: string;
  href?: string;
}

export default function StoneTile({ isActive, icon, title, subtitle, href }: StoneTileProps) {
  const Icon = ICON_MAP[icon] ?? Signal;

  const content = (
    <>
      <Icon size={isActive ? 34 : 20} className={isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)]'} />
      <div className="mono">
        <div className={`text-[11px] uppercase tracking-[0.1em] ${isActive ? 'text-[var(--copper-2)]' : 'text-[var(--copper-0)]'}`}>{title}</div>
        <div className="text-[9px] uppercase tracking-[0.05em] text-[var(--copper-0)] mt-0.5">{subtitle}</div>
      </div>
    </>
  );

  const className = `flex w-full flex-col items-center justify-center gap-2 rounded-[14px] p-4 text-center ${isActive ? 'lit-tile' : 'stone-tile'}`;

  if (href) {
    return <Link href={href} className={`${className} transition-transform hover:-translate-y-1`}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}
```
