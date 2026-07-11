'use client';

import {
  Signal, Mic2, ThermometerSun, Clock, AlertCircle, CheckCircle,
  Power, ShieldCheck, BellOff, HardDrive, MapPin, Navigation2,
  Compass, Lock, RadioReceiver, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  'lucide:signal': Signal,
  'lucide:mic-2': Mic2,
  'lucide:thermometer-sun': ThermometerSun,
  'lucide:clock': Clock,
  'lucide:alert-circle': AlertCircle,
  'lucide:check-circle': CheckCircle,
  'lucide:power': Power,
  'lucide:shield-check': ShieldCheck,
  'lucide:bell-off': BellOff,
  'lucide:hard-drive': HardDrive,
  'lucide:map-pin': MapPin,
  'lucide:navigation-2': Navigation2,
  'lucide:compass': Compass,
  'lucide:lock': Lock,
  'lucide:antenna': RadioReceiver,
};

interface StoneTileProps {
  isActive: boolean;
  icon: string;
  title: string;
  subtitle: string;
}

export default function StoneTile({ isActive, icon, title, subtitle }: StoneTileProps) {
  const Icon = ICON_MAP[icon] ?? Signal;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 border p-4 text-center ${
        isActive
          ? 'border-[var(--copper-1)] bg-[rgba(var(--copper-glow-rgb),0.08)]'
          : 'border-[var(--stone-3)] bg-[var(--stone-1)]'
      }`}
      style={{ borderRadius: '0.5rem' }}
    >
      <Icon
        size={20}
        className={isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--stone-3)]'}
      />
      <div className="mono">
        <div className={`text-[11px] uppercase tracking-[0.1em] ${isActive ? 'text-[var(--copper-2)]' : 'text-[var(--copper-0)]'}`}>
          {title}
        </div>
        <div className="text-[9px] uppercase tracking-[0.05em] text-[var(--copper-0)] mt-0.5">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
