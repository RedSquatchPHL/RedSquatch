'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { HeartPulse, Scale, Droplets, Syringe, Activity } from 'lucide-react';
import AppletModal from '@/components/AppletModal';
import BloodPressureTracker from '@/components/trackers/BloodPressureTracker';
import WeightBmiTracker from '@/components/trackers/glp1/WeightBmiTracker';
import NutritionTracker from '@/components/trackers/glp1/NutritionTracker';
import InjectionTracker from '@/components/trackers/glp1/InjectionTracker';
import DrugLevelTracker from '@/components/trackers/glp1/DrugLevelTracker';
import CopperPanel from '@/components/cenote/CopperPanel';

type Applet = 'blood_pressure' | 'weight' | 'nutrition' | 'injections' | 'drug_levels' | null;

export default function HSHealthPage() {
  const [loading, setLoading] = useState(true);
  const [activeApplet, setActiveApplet] = useState<Applet>(null);
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

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 space-y-8">
      {/* Header */}
      <div className="w-full max-w-5xl">
        <CopperPanel>
          <h1 className="text-3xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
            Health
          </h1>
        </CopperPanel>
      </div>

      {/* Tool cards */}
      <div className="w-full max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: 'blood_pressure' as const, label: 'Blood Pressure Log', description: 'Track systolic/diastolic, heart rate, position, and arm — export to PDF', icon: HeartPulse },
            { key: 'weight' as const, label: 'Weight & BMI', description: 'Weigh-ins in lb, BMI from your height, and the trend toward your target', icon: Scale },
            { key: 'nutrition' as const, label: 'Hydration & Protein', description: 'Daily water and protein totals against your goals, with 14-day trends', icon: Droplets },
            { key: 'injections' as const, label: 'Injections', description: 'Dose log, body-map site rotation guide, and injection history', icon: Syringe },
            { key: 'drug_levels' as const, label: 'Drug Levels', description: 'Estimated active medication in your body from your logged doses', icon: Activity },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveApplet(t.key)}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div
                className="glass-surface rounded-xl p-3 h-full flex flex-col gap-2 border border-transparent"
                style={{
                  borderColor: 'rgba(184,115,51,0.22)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '#b87333';
                  el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(184,115,51,0.25), inset 0 1px 0 rgba(255,255,255,0.06)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'rgba(184,115,51,0.22)';
                  el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div
                  className="p-3 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform w-fit"
                  style={{ backgroundColor: '#b8733322' }}
                >
                  <t.icon size={24} style={{ color: '#b87333' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm" style={{ color: '#d4a373' }}>
                    {t.label}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {t.description}
                  </p>
                </div>
                <div
                  className="h-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  style={{ background: 'linear-gradient(to right, transparent, #b87333, transparent)' }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <AppletModal isOpen={activeApplet === 'blood_pressure'} title="Blood Pressure Log" onClose={() => setActiveApplet(null)} wide>
        <BloodPressureTracker />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'weight'} title="Weight & BMI" onClose={() => setActiveApplet(null)} wide>
        <WeightBmiTracker />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'nutrition'} title="Hydration & Protein" onClose={() => setActiveApplet(null)} wide>
        <NutritionTracker />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'injections'} title="Injections" onClose={() => setActiveApplet(null)} wide>
        <InjectionTracker />
      </AppletModal>

      <AppletModal isOpen={activeApplet === 'drug_levels'} title="Drug Levels" onClose={() => setActiveApplet(null)} wide>
        <DrugLevelTracker />
      </AppletModal>
    </div>
  );
}
