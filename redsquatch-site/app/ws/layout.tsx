'use client';

import MagnificationDock from '@/components/MagnificationDock';
import { BarChart3, Target, Inbox, ClipboardList, Settings } from 'lucide-react';

const WS_NAV = [
  { label: 'Dashboard', icon: BarChart3,     href: '/ws/dashboard' },
  { label: 'Goals',     icon: Target,        href: '/ws/goals'     },
  { label: 'Intake',    icon: Inbox,         href: '/ws/intake'    },
  { label: 'Work',      icon: ClipboardList, href: '/ws/work'      },
  { label: 'Tools',     icon: Settings,      href: '/ws/tools'     },
];

const WS_SWITCH = { label: 'Switch', href: '/hs/dashboard', mode: 'home' as const };

export default function WSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="pb-32">
        {children}
      </main>

      <MagnificationDock nav={WS_NAV} switchTo={WS_SWITCH} />
    </div>
  );
}
