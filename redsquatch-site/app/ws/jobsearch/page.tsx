'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { ExternalLink, FileSearch, Search, FileText, ClipboardList } from 'lucide-react';
import { API } from '@/lib/api';
import AztecHeader from '@/components/aztec/AztecHeader';
import AztecMotion from '@/components/aztec/AztecMotion';
import '@/styles/aztec-command.css';

const unbounded = Unbounded({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-unbounded' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono' });

const JOBOPS_URL = 'https://jobsearch.redsquatch.com';

const FEATURES = [
  { label: 'Job Discovery', description: 'Scrapes LinkedIn, Indeed, Adzuna, Seek and more, ranked by fit against your profile', icon: Search },
  { label: 'Tailored Resumes', description: 'Generates a custom resume PDF per application and keeps the exact version sent', icon: FileText },
  { label: 'Application Tracking', description: 'Snapshots each job description at apply time and tracks status end-to-end', icon: ClipboardList },
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
      <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} flex items-center justify-center min-h-screen`}>
        <div className="text-[var(--ac-copper-light)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`aztec-command ${unbounded.variable} ${jbMono.variable} min-h-screen flex items-center justify-center p-6`}>
      <AztecMotion marqueeItems={['Job Search', 'Applications', 'Resumes', 'Goals', 'RedSquatch']} />

      <div className="relative z-[1] w-full max-w-[1200px] pb-24">
        <AztecHeader label="JOB SEARCH" />

        <a
          href={JOBOPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ac-panel ac-panel--eagle group cursor-pointer text-left flex items-center gap-4 mt-6"
          data-stagger
        >
          <span className="ac-corner ac-corner--tl" />
          <span className="ac-corner ac-corner--tr" />
          <span className="ac-corner ac-corner--bl" />
          <span className="ac-corner ac-corner--br" />
          <div
            className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
            style={{ backgroundColor: 'rgba(184,115,51,0.13)' }}
          >
            <FileSearch size={28} className="text-[var(--ac-copper)]" />
          </div>
          <div className="flex-1">
            <h3 style={{ fontFamily: 'var(--font-unbounded)' }} className="font-bold text-lg text-[var(--ac-copper-light)] flex items-center gap-2">
              Launch JobOps
              <ExternalLink size={16} className="opacity-70" />
            </h3>
            <p className="text-sm mt-0.5 text-[var(--ac-stone-light)]">
              Opens jobsearch.redsquatch.com in a new tab — sign in with the basic-auth
              credentials, then complete the onboarding wizard on first visit.
            </p>
          </div>
        </a>

        <div className="ac-grid grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {FEATURES.map(feature => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className="ac-panel ac-panel--eagle flex flex-col gap-2"
                data-stagger
              >
                <span className="ac-corner ac-corner--tl" />
                <span className="ac-corner ac-corner--tr" />
                <span className="ac-corner ac-corner--bl" />
                <span className="ac-corner ac-corner--br" />
                <div
                  className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 w-fit"
                  style={{ backgroundColor: 'rgba(184,115,51,0.13)' }}
                >
                  <Icon size={24} className="text-[var(--ac-copper)]" />
                </div>
                <div className="flex-1">
                  <h3 style={{ fontFamily: 'var(--font-unbounded)' }} className="font-bold text-sm text-[var(--ac-copper-light)]">
                    {feature.label}
                  </h3>
                  <p className="text-xs mt-0.5 text-[var(--ac-stone-light)]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
