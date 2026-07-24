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
    return <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>No books in the library yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {manifest.map(entry => (
          <button
            key={entry.slug}
            onClick={() => openBook(entry)}
            disabled={loadingSlug === entry.slug}
            className="group cursor-pointer transition-all duration-300 text-left disabled:opacity-50"
          >
            <div
              className="glass-surface rounded-xl p-3 h-full flex flex-col gap-2 border border-transparent"
              style={{
                borderColor: 'rgba(184,115,51,0.22)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#b87333';
                el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(184,115,51,0.22)';
                el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
                style={{ backgroundColor: '#b8733322' }}
              >
                <BookOpen size={24} style={{ color: '#b87333' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm" style={{ color: '#d4a373' }}>
                  {entry.title}
                </h3>
                {entry.author && (
                  <p className="text-[10px] mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {entry.author}
                  </p>
                )}
                {entry.description && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {entry.description}
                  </p>
                )}
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
