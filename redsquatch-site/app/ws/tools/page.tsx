'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Code2, FolderOpen, Library } from 'lucide-react';
import { API } from '@/lib/api';
import AppletModal from '@/components/AppletModal';
import DevelopmentWidget from '@/components/DevelopmentWidget';
import FileTransferPanel from '@/components/FileTransferPanel';
import BookLibrary from '@/components/BookLibrary';
import Bi from '@/components/tonatiuh/Bi';
import s from './tools.module.css';

type AppletKey = 'scratchpad' | 'files' | 'library' | null;

const APPS = [
  { key: 'scratchpad' as const, title: 'Scratchpad', es: 'Bloc de Notas', description: 'Multi-tab code & notes, auto-saved as you type.', icon: Code2 },
  { key: 'files' as const, title: 'Files', es: 'Archivos', description: 'Personal document transfer, up to 1GB per file.', icon: FolderOpen },
  { key: 'library' as const, title: 'Library', es: 'Biblioteca', description: 'A shelf of ebooks, browsable page by page.', icon: Library },
];

export default function WSToolsPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeApplet, setActiveApplet] = useState<AppletKey>(null);
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

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPS;
    return APPS.filter(a => a.title.toLowerCase().includes(q) || a.es.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [query]);

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
          <h1 className={s.wordmark}><Bi es="Herramientas Personales" en="Personal Tools" title /></h1>
        </div>

        <div className={s.searchBar}>
          <Search size={15} className={s.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar herramientas… (Search tools)"
            className={s.searchInput}
          />
        </div>

        {filteredApps.length === 0 ? (
          <div className={s.emptyNote}><Bi es={`Ninguna herramienta coincide con “${query}”.`} en={`No tools match “${query}”.`} inline /></div>
        ) : (
          <div className={s.launcherGrid}>
            {filteredApps.map(app => (
              <button key={app.key} className={s.launcherCard} onClick={() => setActiveApplet(app.key)}>
                <div className={s.launcherIconWrap}><app.icon size={22} /></div>
                <div>
                  <p className={s.launcherTitle}><Bi es={app.es} en={app.title} inline /></p>
                  <p className={s.launcherDesc}>{app.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AppletModal tone="tonatiuh" isOpen={activeApplet === 'scratchpad'} title="Bloc de Notas (Scratchpad)" onClose={() => setActiveApplet(null)} wide>
        <DevelopmentWidget />
      </AppletModal>

      <AppletModal tone="tonatiuh" isOpen={activeApplet === 'files'} title="Archivos (Files)" onClose={() => setActiveApplet(null)} wide>
        <FileTransferPanel />
      </AppletModal>

      <AppletModal tone="tonatiuh" isOpen={activeApplet === 'library'} title="Biblioteca (Library)" onClose={() => setActiveApplet(null)} wide>
        <BookLibrary />
      </AppletModal>
    </div>
  );
}
