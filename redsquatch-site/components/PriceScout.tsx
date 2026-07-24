'use client';

import { useEffect, useState } from 'react';
import { Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { API } from '@/lib/api';

type SourceOption = { id: string; name: string };
type Category = { id: string; label: string; needsZip: boolean; sources: SourceOption[] };

type PriceResult = {
  source: string;
  title: string;
  price: number | null;
  currency: string;
  condition: string | null;
  url: string;
  image: string | null;
};

type SearchError = { source: string; message: string };

const money = (value: number | null, currency: string) => {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

export default function PriceScout() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('general');
  const [checkedSources, setCheckedSources] = useState<Set<string>>(new Set());

  const [zip, setZip] = useState('19046');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PriceResult[]>([]);
  const [errors, setErrors] = useState<SearchError[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/client/prices/categories`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => setCategories([]));
  }, []);

  // Reset to "all sources checked" whenever the category changes (or categories finish loading).
  useEffect(() => {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) setCheckedSources(new Set(cat.sources.map(s => s.id)));
  }, [categoryId, categories]);

  const activeCategory = categories.find(c => c.id === categoryId);

  function toggleSource(id: string) {
    setCheckedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const runSearch = async () => {
    const q = query.trim();
    if (!q || checkedSources.size === 0) return;
    setLoading(true);
    setSearched(true);
    try {
      const sources = Array.from(checkedSources).join(',');
      const zipParam = activeCategory?.needsZip ? `&zip=${encodeURIComponent(zip)}` : '';
      const url = `${API}/api/client/prices/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(categoryId)}&sources=${encodeURIComponent(sources)}${zipParam}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      setResults(res.ok ? (data.results ?? []) : []);
      setErrors(res.ok ? (data.errors ?? []) : [{ source: 'search', message: data.error ?? 'Search failed' }]);
    } catch {
      setResults([]);
      setErrors([{ source: 'network', message: 'Request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoryId(cat.id)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={{
              border: '1px solid rgba(184,115,51,0.3)',
              color: cat.id === categoryId ? '#0f0f0f' : '#d4a373',
              background: cat.id === categoryId ? '#b87333' : 'transparent',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {activeCategory && activeCategory.sources.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {activeCategory.sources.map(src => (
            <label key={src.id} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <input
                type="checkbox"
                checked={checkedSources.has(src.id)}
                onChange={() => toggleSource(src.id)}
                className="accent-[#b87333]"
              />
              {src.name}
            </label>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {activeCategory?.needsZip && (
          <input
            value={zip}
            onChange={e => setZip(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            placeholder="ZIP"
            title="ZIP code for local deals"
            className="w-20 rounded px-3 py-2 text-sm bg-black/20 outline-none"
            style={{ border: '1px solid rgba(184,115,51,0.25)', color: 'rgba(255,255,255,0.85)' }}
          />
        )}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
          placeholder="What are you pricing out?"
          className="flex-1 rounded px-3 py-2 text-sm bg-black/20 outline-none"
          style={{ border: '1px solid rgba(184,115,51,0.25)', color: 'rgba(255,255,255,0.85)' }}
        />
        <button
          onClick={runSearch}
          disabled={loading || !query.trim() || checkedSources.size === 0}
          className="glass-btn px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
        >
          <Search size={14} /> {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="text-xs rounded p-2 flex items-start gap-1.5" style={{ background: 'rgba(224,120,86,0.12)', color: '#e07856' }}>
          <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{errors.map(e => e.message).join(' · ')}</span>
        </div>
      )}

      {searched && !loading && results.length === 0 && errors.length === 0 && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>No results found.</p>
      )}

      {results.length > 0 && (
        <div className="glass-surface rounded-xl p-3 max-h-[28rem] overflow-y-auto" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.4)' }}>
                <th className="text-left font-normal py-1">Item</th>
                <th className="text-left font-normal py-1">Source</th>
                <th className="text-right font-normal py-1">Price</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid rgba(184,115,51,0.1)' }}>
                  <td className="py-1.5 pr-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <div className="flex items-center gap-2">
                      {r.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="w-8 h-8 object-contain rounded flex-shrink-0" />
                      )}
                      <span className="line-clamp-2">{r.title}</span>
                    </div>
                  </td>
                  <td className="py-1.5 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {r.source}{r.condition ? ` · ${r.condition}` : ''}
                  </td>
                  <td className="py-1.5 text-right font-semibold whitespace-nowrap" style={{ color: '#d4a373' }}>
                    {money(r.price, r.currency)}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(184,115,51,0.15)', color: '#d4a373' }}>
                      View <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
