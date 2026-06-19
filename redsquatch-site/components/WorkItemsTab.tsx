'use client';

import WorkLogsWidget from '@/components/WorkLogsWidget';

export default function WorkItemsTab() {
  return (
    <div className="max-w-5xl">
      <WorkLogsWidget defaultTab="demand" excludeTypes={['research']} />
    </div>
  );
}
