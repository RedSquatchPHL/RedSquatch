'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import DevelopmentWidget from '@/components/DevelopmentWidget';
import FileTransferPanel from '@/components/FileTransferPanel';
import CopperPanel from '@/components/cenote/CopperPanel';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import BookLibrary from '@/components/BookLibrary';

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#b87333] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="jungle-bg min-h-screen pb-28">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <HeaderBrand version="2.3" showVersion />
        <div>
          <h1 className="text-4xl text-[#b87333]">Tools</h1>
          <p className="text-[#d4a373] text-sm mt-1">Multi-tab scratchpad, auto-saved as you type.</p>
        </div>

        <CopperPanel>
          <DevelopmentWidget />
        </CopperPanel>

        <CopperPanel title="Files" subtitle="Personal document transfer, up to 1GB per file.">
          <FileTransferPanel />
        </CopperPanel>

        <CopperPanel title="Library" subtitle="A shelf of ebooks, browsable page by page.">
          <BookLibrary />
        </CopperPanel>
      </div>
    </div>
  );
}
