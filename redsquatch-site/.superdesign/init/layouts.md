# Layouts & Nav — WS and HS

## `components/cenote/BottomToolbar.tsx` (full — the component this task modifies)
Fixed, centered-at-viewport-bottom row of square `.stone-tile` links. Rendered **per-page** (each of the 5 `/ws/*` pages includes its own `<BottomToolbar activeItem="...">` — there is no shared layout-level nav for WS). Label text is a hard rule: must equal the destination page name.
```tsx
'use client';

import Link from 'next/link';
import { LayoutDashboard, Target, Inbox, Briefcase, Wrench, LogOut } from 'lucide-react';

type ToolbarItem = 'dashboard' | 'goals' | 'intake' | 'work' | 'tools' | 'logout';

// Label = destination page, so the toolbar never lies about where a button goes.
const ITEMS: { key: ToolbarItem; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/ws/dashboard', icon: LayoutDashboard },
  { key: 'goals', label: 'Goals', href: '/ws/goals', icon: Target },
  { key: 'intake', label: 'Intake', href: '/ws/intake', icon: Inbox },
  { key: 'work', label: 'Work', href: '/ws/work', icon: Briefcase },
  { key: 'tools', label: 'Tools', href: '/ws/tools', icon: Wrench },
  { key: 'logout', label: 'Logout', href: '/logout', icon: LogOut },
];

interface BottomToolbarProps {
  activeItem: ToolbarItem;
}

export default function BottomToolbar({ activeItem }: BottomToolbarProps) {
  return (
    <nav
      className="toolbar-shadow fixed bottom-0 left-0 right-0 z-30 flex justify-center gap-4 pb-6 pointer-events-none"
      aria-label="Bottom toolbar"
    >
      {ITEMS.map(({ key, label, href, icon: Icon }) => {
        const isActive = key === activeItem;
        return (
          <Link
            key={key}
            href={href}
            className={`stone-tile pointer-events-auto mono flex h-[92px] w-[72px] flex-col items-center justify-center gap-2 rounded-[14px] px-2 pb-2 pt-3 text-center text-[10px] uppercase tracking-[0.08em] transition-transform hover:-translate-y-1 ${
              isActive ? 'text-[var(--copper-2)] glow-text' : 'text-[var(--copper-0)] hover:text-[var(--copper-1)]'
            }`}
          >
            <Icon size={27} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

## `components/MagnificationDock.tsx` (full — HS's dock, includes the existing "Switch" precedent)
Used by `app/hs/layout.tsx` (and by `/dashboard` with `DEFAULT_NAV`). Glassmorphic floating pill with spring-physics magnification (`framer-motion`). Has a built-in `DockSwitch` sub-component: circular glass button, `ArrowLeftRight` icon, on click sets `localStorage['redsquatch-mode']` then `router.push()`.
```tsx
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  motion, useMotionValue, useSpring, useTransform, AnimatePresence, type MotionValue,
} from 'framer-motion';
import { BarChart3, Settings, LogOut, ArrowLeftRight, ClipboardList } from 'lucide-react';
import { API } from '@/lib/api';

export interface DockNavItem { label: string; icon: React.ElementType; href: string; }
export interface DockSwitchConfig { label: string; href: string; mode: 'work' | 'home'; }

const DEFAULT_NAV: DockNavItem[] = [
  { label: 'Dashboard', icon: BarChart3,     href: '/dashboard'         },
  { label: 'Intake',    icon: ClipboardList, href: '/dashboard/intake'  },
  { label: 'Tools',     icon: Settings,      href: '/dashboard/tools'   },
];

// ...DockItem, DockSwitch, DockLogout sub-components (magnification physics, tooltips) omitted for
// brevity — not relevant to WS's toolbar since WS uses a different, simpler motion language (see
// design-system.md "Motion" section). The bit that matters for this task is DockSwitch's *behavior*:

function handleSwitch(config: DockSwitchConfig, router: ReturnType<typeof useRouter>) {
  localStorage.setItem('redsquatch-mode', config.mode);
  router.push(config.href);
}

export default function MagnificationDock({ nav = DEFAULT_NAV, switchTo }: { nav?: DockNavItem[]; switchTo?: DockSwitchConfig }) {
  // ...renders nav items, a separator, <DockSwitch config={switchTo} /> if provided, then <DockLogout />
  return null; // see full file at components/MagnificationDock.tsx
}
```

## `app/hs/layout.tsx` (full — HS's shared layout, already wires up the reverse Switch)
```tsx
'use client';

import MagnificationDock from '@/components/MagnificationDock';
import { BarChart3, Target, Trophy, Settings, Gamepad2 } from 'lucide-react';

const HS_NAV = [
  { label: 'Dashboard', icon: BarChart3, href: '/hs/dashboard' },
  { label: 'Goals',     icon: Target,    href: '/hs/goals'     },
  { label: 'Sports',    icon: Trophy,    href: '/hs/sports'    },
  { label: 'Tools',     icon: Settings,  href: '/hs/tools'     },
  { label: 'Downtime',  icon: Gamepad2,  href: '/hs/downtime'  },
];

const HS_SWITCH = { label: 'Switch', href: '/ws/dashboard', mode: 'work' as const };

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jungle-bg min-h-screen">
      <main className="pb-32">
        {children}
      </main>

      <MagnificationDock nav={HS_NAV} switchTo={HS_SWITCH} />
    </div>
  );
}
```

## `app/ws/layout.tsx` (full — WS's layout has NO nav, it's per-page)
```tsx
export default function WSLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```
