'use client';

import MagnificationDock from '@/components/MagnificationDock';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Content — bottom padding so nothing hides behind dock */}
      <main className="pb-32">
        {children}
      </main>

      <MagnificationDock />
    </div>
  );
}
