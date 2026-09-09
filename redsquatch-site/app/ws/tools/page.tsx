'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import DevelopmentWidget from '@/components/DevelopmentWidget';
import FileTransferPanel from '@/components/FileTransferPanel';
import BookLibrary from '@/components/BookLibrary';
import s from './tools.module.css';

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
      <div className={s.page}>
        <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />
        <div className={s.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.7)' }}>Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />

      <div className={s.content}>
        <div className={s.header}>
          <h1 className={s.wordmark}>WorkSquatch</h1>
          <p className={s.subtitle}>PERSONAL TOOLS</p>
        </div>

        <div className={s.panels}>
          <section className={s.panel}>
            <div className={s.woodFrame} />
            <div className={s.panelHead}>
              <h2>Scratchpad</h2>
              <p>Multi-tab code &amp; notes, auto-saved as you type.</p>
            </div>
            <div className={s.panelBody}><DevelopmentWidget /></div>
          </section>

          <section className={s.panel}>
            <div className={s.woodFrame} />
            <div className={s.panelHead}>
              <h2>Files</h2>
              <p>Personal document transfer, up to 1GB per file.</p>
            </div>
            <div className={s.panelBody}><FileTransferPanel /></div>
          </section>

          <div className={s.picadoDivider} />

          <section className={s.panel}>
            <div className={s.woodFrame} />
            <div className={s.panelHead}>
              <h2>Library</h2>
              <p>A shelf of ebooks, browsable page by page.</p>
            </div>
            <div className={s.panelBody}><BookLibrary /></div>
          </section>
        </div>
      </div>
    </div>
  );
}
