'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { API } from '@/lib/api';
import DevelopmentWidget from '@/components/DevelopmentWidget';
import FileTransferPanel from '@/components/FileTransferPanel';
import BookLibrary from '@/components/BookLibrary';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecPanel from '@/components/aztec/AztecPanel';
import AztecMotion from '@/components/aztec/AztecMotion';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

export default function WSToolsPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} flex items-center justify-center min-h-screen`}>
        <div className="text-[var(--ac-copper-light)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} min-h-screen pb-28`}>
      <AztecMotion marqueeItems={['Goals', 'Work Items', 'Sports', 'Tools', 'RedSquatch']} />

      <div className="relative z-[1] max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <AztecHeader label="OVERVIEW" />
        <div>
          <h1 style={{ fontFamily: 'var(--font-unbounded)' }} className="text-4xl font-bold text-[var(--ac-copper-light)]">Tools</h1>
          <p className="text-[var(--ac-stone-light)] text-sm mt-1">Multi-tab scratchpad, auto-saved as you type.</p>
        </div>

        <div className="ac-grid space-y-8">
          <AztecPanel family="fire">
            <DevelopmentWidget />
          </AztecPanel>

          <AztecPanel family="water" title="Files" subtitle="Personal document transfer, up to 1GB per file.">
            <FileTransferPanel />
          </AztecPanel>

          <AztecPanel family="codex" title="Library" subtitle="A shelf of ebooks, browsable page by page.">
            <BookLibrary />
          </AztecPanel>
        </div>
      </div>
    </div>
  );
}
