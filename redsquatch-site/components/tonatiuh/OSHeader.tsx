'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell } from 'lucide-react';
import { WS_NAV } from '@/lib/menuConfig';
import s from './OSHeader.module.css';

// A few aliases beyond the exact WS_NAV labels, so "jobs"/"ba"/"home" etc. also resolve.
const ALIASES: Record<string, string> = {
  home: '/ws/dashboard',
  ba: '/ws/batools',
  'ba tools': '/ws/batools',
  jobs: '/ws/jobsearch',
  'job search': '/ws/jobsearch',
};

function resolveDestination(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (ALIASES[q]) return ALIASES[q];
  const match = WS_NAV.find(item => item.label.toLowerCase().includes(q) || q.includes(item.label.toLowerCase()));
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
      <Link href="/ws/dashboard" className={s.brand}>
        <span className={s.brandWord}><span className={s.brandAccent}>Work</span>Squatch</span>
        <span className={s.dot} />
        <span className={s.brandTag}>OS</span>
      </Link>

      <form className={s.searchForm} onSubmit={handleSubmit}>
        <Search size={14} className={s.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Jump to a page..."
          className={s.searchInput}
        />
        <span className={s.searchHint}>⌘K</span>
      </form>

      <div className={s.actions}>
        <Link href="/ws/jobsearch" className={s.bellLink} title="Job Search">
          <Bell size={18} />
          <span className={s.bellDot} />
        </Link>
      </div>
    </header>
  );
}
