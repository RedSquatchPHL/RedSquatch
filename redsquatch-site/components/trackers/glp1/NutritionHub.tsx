'use client';

import NutritionIntakeForm from './NutritionIntakeForm';
import NutritionTracker from './NutritionTracker';
import FastingTracker from './FastingTracker';

// initialTab is kept for callers that deep-link to the log vs day view, but
// the two panels now live side-by-side rather than in separate tabs.
export default function NutritionHub({ initialTab = 'log' }: { initialTab?: 'log' | 'day' }) {
  void initialTab;
  const accent = { color: 'var(--rs-accent)' } as const;
  const divider = { borderTop: '1px solid rgba(var(--rs-edge-rgb),0.2)', paddingTop: '1.5rem' } as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: Nutrition Log + Fasting Tracker side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <NutritionIntakeForm />
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-wide mb-3" style={accent}>
            Fasting Tracker
          </div>
          <FastingTracker />
        </div>
      </div>

      {/* Day & Trends below */}
      <div style={divider}>
        <div className="text-sm font-bold uppercase tracking-wide mb-4" style={accent}>
          Day &amp; Trends
        </div>
        <NutritionTracker />
      </div>
    </div>
  );
}
