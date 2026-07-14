import type { LucideIcon } from 'lucide-react';
import { FileText, Users, LayoutDashboard, Target, Inbox, Briefcase, Wrench } from 'lucide-react';

export type MenuLeaf =
  | { id: string; label: string; icon: LucideIcon; type: 'internal'; path: string }
  | { id: string; label: string; icon: LucideIcon; type: 'external'; url: string };

// Primary WS navigation, relocated from the old per-page BottomToolbar (now retired)
// into this one global menu. Order matches BottomToolbar's original left-to-right order.
export const PRIMARY_NAV: MenuLeaf[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'internal', path: '/ws/dashboard' },
  { id: 'goals', label: 'Goals', icon: Target, type: 'internal', path: '/ws/goals' },
  { id: 'intake', label: 'Intake', icon: Inbox, type: 'internal', path: '/ws/intake' },
  { id: 'work', label: 'Work', icon: Briefcase, type: 'internal', path: '/ws/work' },
  { id: 'tools', label: 'Tools', icon: Wrench, type: 'internal', path: '/ws/tools' },
];

// Icon-only, slide-right submenu under the Quick Links row in ClockGateMenu.tsx —
// external services, distinct from the "Tools" nav item above (that's the /ws/tools
// page; these are outside links). Add entries here to add/remove them.
// `label` shows as the button's tooltip since the row is icons-only.
export const QUICK_LINKS_SUBMENU: MenuLeaf[] = [
  { id: 'grampsweb', label: 'Grampsweb', icon: Users, type: 'external', url: 'https://gramps.redsquatch.com' },
  { id: 'stirling', label: 'Stirling-PDF', icon: FileText, type: 'external', url: 'https://pdf.redsquatch.com' },
];
