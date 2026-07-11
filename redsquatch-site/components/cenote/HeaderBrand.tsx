'use client';

interface HeaderBrandProps {
  version?: string;
  showVersion?: boolean;
}

export default function HeaderBrand({ version, showVersion = false }: HeaderBrandProps) {
  return (
    <header className="mb-3 flex items-center justify-center border-b border-[var(--stone-3)] pb-2 text-[12px] tracking-wide text-[var(--copper-2)]">
      <span>REDSQUATCH</span>
      <span className="mx-3 text-[var(--stone-3)]">|</span>
      <span>COMMAND CENTER</span>
      {showVersion && version && (
        <>
          <span className="mx-3 text-[var(--stone-3)]">|</span>
          <span>v{version} [SECURE_LINK]</span>
        </>
      )}
    </header>
  );
}
