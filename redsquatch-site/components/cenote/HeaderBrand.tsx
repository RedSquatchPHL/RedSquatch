'use client';

interface HeaderBrandProps {
  version?: string;
  showVersion?: boolean;
}

export default function HeaderBrand({ version, showVersion = false }: HeaderBrandProps) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--stone-3)] pb-4">
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-[var(--copper-1)]" aria-hidden="true">
          <path
            d="M2 18c3-1 3-6 6-8s5 1 8-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <circle cx="16" cy="8" r="1.5" fill="currentColor" />
        </svg>
        <span className="glyph text-2xl uppercase tracking-[0.15em] text-[var(--copper-2)] glow-text">
          RedSquatch
        </span>
      </div>
      {showVersion && version && (
        <span className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--copper-1)] border border-[var(--stone-3)] px-2 py-1">
          v{version}
        </span>
      )}
    </header>
  );
}
