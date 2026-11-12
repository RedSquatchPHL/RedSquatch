'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { HeartPulse, Scale, Syringe, Utensils, Timer, UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react';
import AppletModal from '@/components/AppletModal';
import BloodPressureTracker from '@/components/trackers/BloodPressureTracker';
import WeightBmiTracker from '@/components/trackers/glp1/WeightBmiTracker';
import NutritionHub from '@/components/trackers/glp1/NutritionHub';
import InjectionsHub from '@/components/trackers/glp1/InjectionsHub';
import FastingTracker from '@/components/trackers/glp1/FastingTracker';
import CopperPanel from '@/components/cenote/CopperPanel';
import PageLoader from '@/components/ui/PageLoader';
import HealthCountdown from '@/components/HealthCountdown';
import FastingWidget from '@/components/FastingWidget';

type Applet = 'blood_pressure' | 'weight' | 'nutrition' | 'injections' | 'fasting' | null;
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
  const [showCountdown, setShowCountdown] = useState(false);
  const [showFasting, setShowFasting] = useState(false);
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
          {/* Always-visible row: title + person selector */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold shrink-0" style={{ color: 'var(--rs-accent)', textShadow: '0 0 16px rgba(var(--rs-accent-rgb),0.3)' }}>
              Health
            </h1>
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

          {/* Desktop: timers inline */}
          <div className="hidden sm:flex justify-center items-center gap-6 mt-3 pt-3" style={{ borderTop: '1px solid rgba(var(--rs-edge-rgb),0.1)' }}>
            <HealthCountdown />
            <div className="w-px h-8 opacity-20" style={{ background: 'var(--rs-accent)' }} />
            <FastingWidget onOpen={() => setActiveApplet('fasting')} />
          </div>

          {/* Mobile: collapsible timer toggles */}
          <div className="sm:hidden mt-3 space-y-1" style={{ borderTop: '1px solid rgba(var(--rs-edge-rgb),0.1)', paddingTop: 10 }}>
            {/* Health countdown toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowCountdown(v => !v)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono"
                style={{ background: 'rgba(var(--rs-edge-rgb),0.08)', color: 'rgba(var(--rs-accent-rgb),0.7)' }}
              >
                <span className="flex items-center gap-1.5">
                  <Timer size={11} /> Health Timer
                </span>
                {showCountdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showCountdown && (
                <div className="mt-2 flex justify-center py-1">
                  <HealthCountdown />
                </div>
              )}
            </div>

            {/* Fasting toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowFasting(v => !v)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono"
                style={{ background: 'rgba(var(--rs-edge-rgb),0.08)', color: 'rgba(var(--rs-accent-rgb),0.7)' }}
              >
                <span className="flex items-center gap-1.5">
                  <UtensilsCrossed size={11} /> Fasting Tracker
                </span>
                {showFasting ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showFasting && (
                <div className="mt-2 flex justify-center py-1">
                  <FastingWidget onOpen={() => setActiveApplet('fasting')} />
                </div>
              )}
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
            { key: 'fasting' as const, label: 'Fasting Tracker', description: 'Start and stop fasts, choose your protocol, and track elapsed time', icon: Timer },
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

        <AppletModal isOpen={activeApplet === 'fasting'} title="Fasting Tracker" onClose={() => setActiveApplet(null)}>
          <FastingTracker />
        </AppletModal>
      </>}
    </div>
  );
}
