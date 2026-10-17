'use client';

import HSHeader from '@/components/tonatiuh/HSHeader';

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jungle-bg min-h-screen">
      <HSHeader />
      <main>
        {children}
      </main>
    </div>
  );
}
