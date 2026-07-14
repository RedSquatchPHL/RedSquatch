import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutDashboard, Target, Inbox, Briefcase, Wrench, Trophy, Gamepad2, Landmark } from 'lucide-react';

export type MenuLeaf =
  | { id: string; label: string; icon: LucideIcon; type: 'internal'; path: string }
  | { id: string; label: string; icon: LucideIcon; type: 'external'; url: string };

// Primary nav, relocated from the old per-page BottomToolbar (/ws/*) and the shared
// HSToolbar (/hs/*), both now retired — ClockGateMenu picks whichever list matches the
// current route (see `inHS` there) so the two never appear together and their same-
// named items (Dashboard/Goals/Tools) never collide in one list. Order matches each
// original toolbar's left-to-right order.
export const WS_NAV: MenuLeaf[] = [
  { id: 'ws-dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'internal', path: '/ws/dashboard' },
  { id: 'ws-goals', label: 'Goals', icon: Target, type: 'internal', path: '/ws/goals' },
  { id: 'ws-intake', label: 'Intake', icon: Inbox, type: 'internal', path: '/ws/intake' },
  { id: 'ws-work', label: 'Work', icon: Briefcase, type: 'internal', path: '/ws/work' },
  { id: 'ws-tools', label: 'Tools', icon: Wrench, type: 'internal', path: '/ws/tools' },
];

export const HS_NAV: MenuLeaf[] = [
  { id: 'hs-dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'internal', path: '/hs/dashboard' },
  { id: 'hs-goals', label: 'Goals', icon: Target, type: 'internal', path: '/hs/goals' },
  { id: 'hs-sports', label: 'Sports', icon: Trophy, type: 'internal', path: '/hs/sports' },
  { id: 'hs-tools', label: 'Tools', icon: Wrench, type: 'internal', path: '/hs/tools' },
  { id: 'hs-mexican', label: 'Mexican', icon: Landmark, type: 'internal', path: '/hs/mexican' },
  { id: 'hs-downtime', label: 'Downtime', icon: Gamepad2, type: 'internal', path: '/hs/downtime' },
];

// Icon-only, slide-right submenu under the Quick Links row in ClockGateMenu.tsx —
// external services, distinct from the "Tools" nav items above (those are the real
// /ws/tools and /hs/tools pages; these are outside links). Add entries here to
// add/remove them. `label` shows as the button's tooltip since the row is icons-only.
// Grampsweb lived here too until 2026-07-14 — removed once it got a proper embedded
// home at /hs/mexican (via ToolModal), so it wasn't reachable two different ways.
export const QUICK_LINKS_SUBMENU: MenuLeaf[] = [
  { id: 'stirling', label: 'Stirling-PDF', icon: FileText, type: 'external', url: 'https://pdf.redsquatch.com' },
];
