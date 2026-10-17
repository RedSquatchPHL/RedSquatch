'use client';

import HSHeader from '@/components/tonatiuh/HSHeader';
import OceanBackground from '@/components/hs/OceanBackground';

export default function HSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ position: 'relative', background: '#0a0a0f' }}>
      <OceanBackground />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <HSHeader />
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
