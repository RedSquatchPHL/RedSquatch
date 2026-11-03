'use client';

import { useState } from 'react';
import { TabSwitch } from './shared';
import InjectionTracker from './InjectionTracker';
import DrugLevelTracker from './DrugLevelTracker';

// Each tab remounts its tracker on switch, so Drug Levels always refetches the doses just logged in Injections.
const TABS = [{ key: 'log', label: 'Injections' }, { key: 'levels', label: 'Drug Levels' }] as const;

export default function InjectionsHub() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('log');
  return (
    <div>
      <TabSwitch tabs={[...TABS]} value={tab} onChange={setTab} />
      {tab === 'log' ? <InjectionTracker /> : <DrugLevelTracker />}
    </div>
  );
}
