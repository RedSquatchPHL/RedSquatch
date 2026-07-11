'use client';

import HSToolbar from '@/components/cenote/HSToolbar';

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="jungle-bg min-h-screen">
      <main className="pb-32">
        {children}
      </main>

      <HSToolbar />
    </div>
  );
}
