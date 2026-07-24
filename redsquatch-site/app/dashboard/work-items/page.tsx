// File: /root/n8n-docker/redsquatch-site/app/dashboard/work-items/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import WorkLogsWidget          from '@/components/WorkLogsWidget';
import { API }                 from '@/lib/api';
import CopperPanel             from '@/components/cenote/CopperPanel';

export default function WorkItemsPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // Auth guard — same pattern as tools/page.tsx
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-copper text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-8">
      {/* Header */}
      <div className="mb-8 max-w-5xl">
        <CopperPanel>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-playfair text-copper">Work Items</h1>
            <span className="text-xs text-light-copper border border-[rgba(184,115,51,0.25)] rounded px-2 py-0.5 uppercase tracking-wider">
              Lincoln
            </span>
          </div>
          <p className="text-light-copper text-sm">
            Log billable work and research sessions for Lincoln Financial Group engagements.
          </p>
        </CopperPanel>
      </div>

      {/* Widget */}
      <div className="max-w-5xl">
        <WorkLogsWidget defaultTab="demand" />
      </div>
    </div>
  );
}
