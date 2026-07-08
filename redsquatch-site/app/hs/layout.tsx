'use client';

import MagnificationDock from '@/components/MagnificationDock';
import { BarChart3, Target, Zap, Settings, Gamepad2 } from 'lucide-react';

const HS_NAV = [
  { label: 'Dashboard', icon: BarChart3, href: '/hs/dashboard' },
  { label: 'Goals',     icon: Target,    href: '/hs/goals'     },
  { label: 'Sports',    icon: Zap,       href: '/hs/sports'    },
  { label: 'Tools',     icon: Settings,  href: '/hs/tools'     },
  { label: 'Downtime',  icon: Gamepad2,  href: '/hs/downtime'  },
];

const HS_SWITCH = { label: 'Switch', href: '/ws/dashboard', mode: 'work' as const };

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="pb-32">
        {children}
      </main>

      <MagnificationDock nav={HS_NAV} switchTo={HS_SWITCH} />
    </div>
  );
}
