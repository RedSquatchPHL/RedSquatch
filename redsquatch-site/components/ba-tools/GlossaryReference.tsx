'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES } from '@/lib/ba-content';

export default function GlossaryReference() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY_TERMS
      .filter(t => !category || t.category === category)
      .filter(t => !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [query, category]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#756558' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search terms and definitions..."
          className="w-full text-sm pl-9 pr-3 py-2 outline-none"
          style={{
            background: 'rgba(44,36,32,0.04)',
            border: '1px solid rgba(184,115,51,0.25)',
            color: '#2c2420',
          }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory(null)}
          className="text-xs px-2.5 py-1 transition-colors"
          style={{
            border: '1px solid ' + (category === null ? 'rgba(184,115,51,0.6)' : 'rgba(44,36,32,0.15)'),
            background: category === null ? 'rgba(184,115,51,0.18)' : 'transparent',
            color: category === null ? '#8f6540' : '#6b635f',
          }}
        >
          All ({GLOSSARY_TERMS.length})
        </button>
        {GLOSSARY_CATEGORIES.map(cat => {
          const count = GLOSSARY_TERMS.filter(t => t.category === cat).length;
          const isSelected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(isSelected ? null : cat)}
              className="text-xs px-2.5 py-1 transition-colors"
              style={{
                border: '1px solid ' + (isSelected ? 'rgba(184,115,51,0.6)' : 'rgba(44,36,32,0.15)'),
                background: isSelected ? 'rgba(184,115,51,0.18)' : 'transparent',
                color: isSelected ? '#8f6540' : '#6b635f',
              }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-xs text-center py-6" style={{ color: '#756558' }}>
            No terms match "{query}".
          </div>
        )}
        {filtered.map(t => (
          <div
            key={t.term}
            className="p-3"
            style={{ border: '1px solid rgba(184,115,51,0.2)', background: 'rgba(44,36,32,0.04)' }}
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: '#8f6540' }}>{t.term}</span>
              <span
                className="text-[10px] uppercase tracking-wide px-2 py-0.5 flex-shrink-0"
                style={{ background: 'rgba(184,115,51,0.12)', color: '#8f6540' }}
              >
                {t.category}
              </span>
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#463a33' }}>{t.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
