import type { LucideIcon } from 'lucide-react';
import { FileText, Users } from 'lucide-react';

export type MenuLeaf =
  | { id: string; label: string; icon: LucideIcon; type: 'internal'; path: string }
  | { id: string; label: string; icon: LucideIcon; type: 'external'; url: string };

// Icon-only, slide-right submenu under the Tools row in ClockGateMenu.tsx.
// Add entries here to add/remove tools — nothing else needs to change.
// `label` shows as the button's tooltip since the row is icons-only.
export const TOOLS_SUBMENU: MenuLeaf[] = [
  { id: 'grampsweb', label: 'Grampsweb', icon: Users, type: 'external', url: 'https://gramps.redsquatch.com' },
  { id: 'stirling', label: 'Stirling-PDF', icon: FileText, type: 'external', url: 'https://pdf.redsquatch.com' },
];
