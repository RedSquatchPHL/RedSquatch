'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { HeartPulse, Scale, Syringe, Utensils } from 'lucide-react';
import AppletModal from '@/components/AppletModal';
import BloodPressureTracker from '@/components/trackers/BloodPressureTracker';
import WeightBmiTracker from '@/components/trackers/glp1/WeightBmiTracker';
import NutritionHub from '@/components/trackers/glp1/NutritionHub';
import InjectionsHub from '@/components/trackers/glp1/InjectionsHub';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';
import HealthCountdown from '@/components/HealthCountdown';

type Applet = 'blood_pressure' | 'weight' | 'nutrition' | 'injections' | null;
type Person = 'me' | 'declan' | 'denise';

const PEOPLE: { key: Person; label: string }[] = [
  { key: 'me', label: 'Me' },
  { key: 'declan', label: 'Declan' },
  { key: 'denise', label: 'Denise' },
];

export default function HSHealthPage() {
  const [loading, setLoading] = useState(true);
  const [activeApplet, setActiveApplet] = useState<Applet>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person>('me');
  const [nutritionTab, setNutritionTab] = useState<'log' | 'day'>('log');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }
        // ?open=nutrition lets the intake page link straight to the log.
        if (new URLSearchParams(window.location.search).get('open') === 'nutrition') { setNutritionTab('day'); setActiveApplet('nutrition'); }
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  if (loading) return <PageLoader />;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 space-y-8">
      {/* Header */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold shrink-0" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>
              Health
            </h1>
            <div className="flex-1 flex justify-center">
              <HealthCountdown />
            </div>
            <div className="flex gap-1 shrink-0">
              {PEOPLE.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedPerson(key)}
                  className="px-3 py-1 text-sm font-mono rounded transition-all duration-200"
                  style={selectedPerson === key ? {
                    background: 'rgba(var(--rs-accent-rgb),0.2)',
                    border: '1px solid rgba(var(--rs-accent-rgb),0.6)',
                    color: 'var(--rs-accent)',
                    textShadow: '0 0 8px rgba(var(--rs-accent-rgb),0.4)',
                  } : {
                    background: 'transparent',
                    border: '1px solid rgba(var(--rs-accent-rgb),0.2)',
                    color: 'rgba(var(--rs-accent-rgb),0.5)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CopperPanel>
      </div>

      {/* Tool cards — only shown for the primary user */}
      {selectedPerson === 'me' && <div className="w-full max-w-5xl">
        <div className="rs-spotlight grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'blood_pressure' as const, label: 'Blood Pressure Log', description: 'Track systolic/diastolic, heart rate, position, and arm — export to PDF', icon: HeartPulse },
            { key: 'weight' as const, label: 'Weight & BMI', description: 'Weigh-ins in lb, BMI from your height, and the trend toward your target', icon: Scale },
            { key: 'nutrition' as const, label: 'Nutrition', description: 'Log drinks and meals with macros, and track water and protein against your goals with 14-day trends', icon: Utensils },
            { key: 'injections' as const, label: 'Injections & Drug Levels', description: 'Dose log, body-map site rotation, injection history, and estimated active medication', icon: Syringe },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => { if (t.key === 'nutrition') setNutritionTab('log'); setActiveApplet(t.key); }}
              className="rs-applet-trigger"
            >
              <div className="rs-applet-card rs-orbit">
                <div className="rs-applet-icon">
                  <t.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="rs-applet-title">{t.label}</h3>
                  <p className="rs-applet-desc">{t.description}</p>
                </div>
                <div className="rs-applet-bar" />
              </div>
            </button>
          ))}
        </div>
      </div>}

      {selectedPerson === 'me' && <>
        <AppletModal isOpen={activeApplet === 'blood_pressure'} title="Blood Pressure Log" onClose={() => setActiveApplet(null)} wide>
          <BloodPressureTracker />
        </AppletModal>

        <AppletModal isOpen={activeApplet === 'weight'} title="Weight & BMI" onClose={() => setActiveApplet(null)} wide>
          <WeightBmiTracker />
        </AppletModal>

        <AppletModal isOpen={activeApplet === 'nutrition'} title="Nutrition" onClose={() => setActiveApplet(null)} wide>
          <NutritionHub initialTab={nutritionTab} />
        </AppletModal>

        <AppletModal isOpen={activeApplet === 'injections'} title="Injections & Drug Levels" onClose={() => setActiveApplet(null)} wide>
          <InjectionsHub />
        </AppletModal>
      </>}
    </div>
  );
}
