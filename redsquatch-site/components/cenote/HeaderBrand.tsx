'use client';

interface HeaderBrandProps {
  version?: string;
  showVersion?: boolean;
  label?: string;
}

export default function HeaderBrand({ version, showVersion = false, label = 'COMMAND CENTER' }: HeaderBrandProps) {
  return (
    <header className="mb-3 flex items-center justify-center border-b border-[var(--stone-3)] pb-2 text-[12px] tracking-wide text-[var(--copper-2)]">
      <span>REDSQUATCH</span>
      <span className="mx-3 text-[var(--stone-3)]">|</span>
      <span>{label}</span>
      {showVersion && version && (
        <>
          <span className="mx-3 text-[var(--stone-3)]">|</span>
          <span>v{version}</span>
        </>
      )}
    </header>
  );
}
