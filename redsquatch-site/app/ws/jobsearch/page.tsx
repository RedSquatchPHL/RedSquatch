'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, FileSearch, Search, FileText, ClipboardList } from 'lucide-react';
import { API } from '@/lib/api';
import s from './jobsearch.module.css';

const JOBOPS_URL = 'https://jobsearch.redsquatch.com';

const FEATURES = [
  { title: 'Job Discovery', description: 'Scrapes LinkedIn, Indeed, Adzuna, Seek and more, ranked by fit against your profile', icon: Search },
  { title: 'Tailored Resumes', description: 'Generates a custom resume PDF per application and keeps the exact version sent', icon: FileText },
  { title: 'Application Tracking', description: 'Snapshots each job description at apply time and tracks status end-to-end', icon: ClipboardList },
];

export default function WSJobSearchPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) { router.push('/'); return; }
        setChecking(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (checking) {
    return (
      <div className={s.page}>
        <div className={s.wallTexture} /><div className={s.wallColor} /><div className={s.wallGlow} />
        <div className={s.content} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ color: 'rgba(255,250,240,0.85)' }}>Loading…</div>
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
          <p className={s.subtitle}>JOB SEARCH</p>
        </div>

        <div className={s.group}>
          <h2 className={s.groupLabel}>
            <span className={s.groupDot} style={{ background: '#D97A38' }} />
            Launch
          </h2>
          <div className={s.cardList}>
            <a href={JOBOPS_URL} target="_blank" rel="noopener noreferrer" className={`${s.card} ${s.launchCard}`}>
              <div className={s.iconWrap}><FileSearch size={18} /></div>
              <div className={s.cardBody}>
                <p className={s.cardTitle}>JobOps</p>
                <p className={s.cardDesc}>
                  Opens jobsearch.redsquatch.com in a new tab — sign in with the basic-auth credentials,
                  then complete the onboarding wizard on first visit.
                </p>
                <span className={s.launchBtn}>Launch JobOps <ExternalLink size={13} /></span>
              </div>
            </a>
          </div>
        </div>

        <div className={s.group}>
          <h2 className={s.groupLabel}>
            <span className={s.groupDot} style={{ background: '#D4AF37' }} />
            Capabilities
          </h2>
          <div className={s.cardList}>
            {FEATURES.map(feature => (
              <div key={feature.title} className={s.card} style={{ borderLeftColor: '#D4AF37' }}>
                <div className={s.iconWrap} style={{ background: 'rgba(212,175,55,0.18)', color: '#D4AF37' }}>
                  <feature.icon size={18} />
                </div>
                <div className={s.cardBody}>
                  <p className={s.cardTitle}>{feature.title}</p>
                  <p className={s.cardDesc}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
