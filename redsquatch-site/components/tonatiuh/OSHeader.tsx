'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { WS_NAV } from '@/lib/menuConfig';
import ClockGateMenu from '@/components/ClockGateMenu';
import LocationWidgets from './LocationWidgets';
import BrandMark from './BrandMark';
import { WS_NAV_ES, WS_SEARCH_ALIASES } from '@/lib/bilingual';
import s from './OSHeader.module.css';

function resolveDestination(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (WS_SEARCH_ALIASES[q]) return WS_SEARCH_ALIASES[q];
  const match = WS_NAV.find(item => {
    const en = item.label.toLowerCase();
    const es = (WS_NAV_ES[item.id] ?? '').toLowerCase();
    return en.includes(q) || q.includes(en) || (es && (es.includes(q) || q.includes(es)));
  });
  return match?.type === 'internal' ? match.path : null;
}

export default function OSHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dest = resolveDestination(query);
    if (dest) {
      router.push(dest);
      setQuery('');
      inputRef.current?.blur();
    }
  }

  return (
    <header className={s.bar}>
      <BrandMark side="work" />

      <form className={s.searchForm} onSubmit={handleSubmit}>
        <Search size={14} className={s.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ir a una página… (Jump to a page)"
          className={s.searchInput}
        />
        <span className={s.searchHint}>⌘K</span>
      </form>

      <div className={s.actions}>
        <LocationWidgets />
        <ClockGateMenu />
      </div>
    </header>
  );
}
