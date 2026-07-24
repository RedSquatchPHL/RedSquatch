'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, List, X } from 'lucide-react';

export interface BookPage {
  page_number: number;
  title: string;
  content: string;
}

export interface Book {
  title: string;
  pages: BookPage[];
}

export default function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const page = book.pages[index];

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex(i => Math.min(i + 1, book.pages.length - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') tocOpen ? setTocOpen(false) : onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book.pages.length, tocOpen, onClose]);

  const jumpTo = (i: number) => {
    setIndex(i);
    setTocOpen(false);
  };

  // Portal straight to <body>: rendering in place would nest this "fixed" overlay under
  // CopperPanel, whose clip-path makes it a containing block for fixed descendants —
  // that traps the overlay inside the panel's box instead of covering the viewport.
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: '#050403' }}>
      <div
        className="flex items-center justify-between px-4 sm:px-8 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(184,115,51,0.25)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTocOpen(o => !o)}
            className="glass-btn px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5"
          >
            <List size={14} /> Contents
          </button>
          <h2 className="text-sm font-semibold hidden sm:block" style={{ color: '#d4a373' }}>
            {book.title}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Page {index + 1} of {book.pages.length}
          </span>
          <button onClick={onClose} title="Close" style={{ color: '#d4a373' }}>
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Unbounded scroll canvas — the "page" below sets a minimum letter-page shape but is free to grow taller than one screen. */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto my-8 sm:my-12 px-8 sm:px-16 py-10 sm:py-16 rounded-sm"
          style={{
            width: 'min(680px, 92vw)',
            minHeight: 'calc(min(680px, 92vw) * 11 / 8.5)',
            background: 'rgba(16,13,10,0.55)',
            border: '1px solid rgba(184,115,51,0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <h3 className="text-2xl sm:text-3xl font-semibold mb-6" style={{ color: '#d4a373' }}>
            {page.title}
          </h3>
          <p className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {page.content}
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-between px-4 sm:px-8 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(184,115,51,0.2)' }}
      >
        <button
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="glass-btn px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-30"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={() => setIndex(i => Math.min(i + 1, book.pages.length - 1))}
          disabled={index === book.pages.length - 1}
          className="glass-btn px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 disabled:opacity-30"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {tocOpen && (
        <>
          <div className="fixed inset-0 z-10 bg-black/50" onClick={() => setTocOpen(false)} />
          <div
            className="fixed inset-y-0 left-0 z-20 w-72 max-w-[85%] overflow-y-auto p-4"
            style={{ background: 'rgba(10,8,6,0.98)', borderRight: '1px solid rgba(184,115,51,0.3)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#d4a373' }}>Contents</span>
              <button onClick={() => setTocOpen(false)} style={{ color: '#d4a373' }}>
                <X size={16} />
              </button>
            </div>
            {book.pages.map((p, i) => (
              <button
                key={p.page_number}
                onClick={() => jumpTo(i)}
                className="w-full text-left text-xs px-2 py-1.5 rounded mb-0.5 transition-colors"
                style={{
                  color: i === index ? '#0f0f0f' : 'rgba(255,255,255,0.65)',
                  background: i === index ? '#b87333' : 'transparent',
                }}
              >
                {p.title}
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
