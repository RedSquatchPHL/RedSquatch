'use client';

import { useState } from 'react';
import NutritionIntakeForm from './NutritionIntakeForm';
import NutritionTracker from './NutritionTracker';

export default function NutritionHub({ initialTab = 'log' }: { initialTab?: 'log' | 'day' }) {
  void initialTab;
  const divider = { borderTop: '1px solid rgba(var(--rs-edge-rgb),0.2)', paddingTop: '1.5rem' } as const;
  const [reloadSignal, setReloadSignal] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <NutritionIntakeForm onSubmit={() => setReloadSignal(s => s + 1)} />

      <div style={divider}>
        <NutritionTracker key={reloadSignal} />
      </div>
    </div>
  );
}
