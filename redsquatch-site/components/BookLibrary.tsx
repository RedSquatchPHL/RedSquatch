'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import BookReader, { Book } from '@/components/BookReader';

interface ManifestEntry {
  slug: string;
  title: string;
  author?: string;
  description?: string;
  /** 'pages' (default) opens the in-app reader; 'pdf' opens the original file directly. */
  type?: 'pages' | 'pdf';
  file?: string;
  pageCount?: number;
}

export default function BookLibrary() {
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch('/books/manifest.json')
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest([]));
  }, []);

  const openBook = async (entry: ManifestEntry) => {
    if (entry.type === 'pdf') {
      window.open(`/books/${entry.file}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setLoadingSlug(entry.slug);
    try {
      const res = await fetch(`/books/${entry.slug}.json`);
      const data = await res.json();
      setActiveBook(data);
    } finally {
      setLoadingSlug(null);
    }
  };

  if (manifest.length === 0) {
    return <p className="text-xs" style={{ color: '#93A4B8' }}>No books in the library yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4">
        {manifest.map(entry => (
          <button
            key={entry.slug}
            onClick={() => openBook(entry)}
            disabled={loadingSlug === entry.slug}
            className="group cursor-pointer transition-all duration-300 text-left disabled:opacity-50"
          >
            <div
              className="p-3 h-full flex flex-col gap-2"
              style={{
                background: 'rgba(22,30,40,0.85)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 14px rgba(44,36,32,0.08)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#D97A38';
                el.style.boxShadow = '0 6px 20px rgba(44,36,32,0.14)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(255,255,255,0.1)';
                el.style.boxShadow = '0 4px 14px rgba(44,36,32,0.08)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="p-3 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
                style={{ backgroundColor: 'rgba(217,122,56,0.12)' }}
              >
                <BookOpen size={24} style={{ color: '#D97A38' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm" style={{ color: '#E2E8F0' }}>
                  {entry.title}
                </h3>
                {entry.author && (
                  <p className="text-[10px] mt-0.5 italic" style={{ color: '#93A4B8' }}>
                    {entry.author}
                  </p>
                )}
                {entry.description && (
                  <p className="text-xs mt-0.5" style={{ color: '#93A4B8' }}>
                    {entry.description}
                  </p>
                )}
                <p className="text-[10px] mt-1" style={{ color: '#93A4B8', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
                  {entry.type === 'pdf' ? 'Opens as PDF' : `${entry.pageCount} pages`}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {activeBook && <BookReader book={activeBook} onClose={() => setActiveBook(null)} />}
    </>
  );
}
