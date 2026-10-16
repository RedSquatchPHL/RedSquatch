'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WS_NAV } from '@/lib/menuConfig';
import { WS_NAV_ES } from '@/lib/bilingual';
import Bi from './Bi';
import s from './SideRail.module.css';

// Tōnatiuh OS icon rail (the SuperDesign drafts' shared SidebarNavigation).
// Items come from the real WS_NAV list, not the drafts' placeholder
// Files/Notes. No settings slot: the clock/account menu lives in OSHeader.
export default function SideRail() {
  const pathname = usePathname() ?? '';

  return (
    <nav className={s.rail} aria-label="WorkSquatch navigation">
      <Link href="/ws/dashboard" className={s.logo} aria-label="WorkSquatch dashboard">
        <span className={s.logoMark}>W</span>
      </Link>

      <ul className={s.items}>
        {WS_NAV.map(item => {
          if (item.type !== 'internal') return null;
          const Icon = item.icon;
          const active = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <li key={item.id}>
              <Link
                href={item.path}
                className={`${s.item} ${active ? s.itemActive : ''}`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={22} />
                <span className={s.tip}><Bi es={WS_NAV_ES[item.id] ?? item.label} en={item.label} inline /></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
