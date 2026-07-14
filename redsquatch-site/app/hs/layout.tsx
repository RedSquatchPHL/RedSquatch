'use client';

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jungle-bg min-h-screen">
      <main>
        {children}
      </main>
    </div>
  );
}
