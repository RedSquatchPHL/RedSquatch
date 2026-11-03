'use client';

import { useState } from 'react';
import { TabSwitch } from './shared';
import NutritionIntakeForm from './NutritionIntakeForm';
import NutritionTracker from './NutritionTracker';

// Each tab remounts on switch, so Day & Trends refetches whatever was just logged.
const TABS = [{ key: 'log', label: 'Log' }, { key: 'day', label: 'Day & Trends' }] as const;
type Tab = (typeof TABS)[number]['key'];

export default function NutritionHub({ initialTab = 'log' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div>
      <TabSwitch tabs={[...TABS]} value={tab} onChange={setTab} />
      {tab === 'log' ? <NutritionIntakeForm onViewLog={() => setTab('day')} /> : <NutritionTracker />}
    </div>
  );
}
