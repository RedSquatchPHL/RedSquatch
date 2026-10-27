'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { API } from '@/lib/api';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';
import NutritionIntakeForm from '@/components/trackers/glp1/NutritionIntakeForm';

// Full-page home of the Nutrition Intake form (the PWA start URL). The same form is
// also available as a card on /hs/health.
export default function IntakePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  if (loading) return <PageLoader />;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6">
      <Link href="/hs/health" className="inline-flex items-center gap-1.5 text-xs mb-3 min-h-[44px] sm:min-h-0" style={{ color: 'rgba(var(--rs-accent-rgb),0.7)' }}>
        <ArrowLeft size={14} /> Health
      </Link>
      <CopperPanel>
        <NutritionIntakeForm onViewLog={() => router.push('/hs/health?open=nutrition')} />
      </CopperPanel>
    </div>
  );
}
