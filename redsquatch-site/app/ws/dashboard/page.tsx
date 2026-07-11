'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bug, ScanLine, Clock3, AlertTriangle, Network, ShieldCheck, Fingerprint } from 'lucide-react';
import { API } from '@/lib/api';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import StoneTile from '@/components/cenote/StoneTile';
import CopperPanel from '@/components/cenote/CopperPanel';
import PipelineDiagram from '@/components/cenote/PipelineDiagram';
import WireframeProfile from '@/components/cenote/WireframeProfile';
import BottomToolbar from '@/components/cenote/BottomToolbar';

export default function WSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) router.push('/');
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--copper-1)] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="jungle-bg min-h-screen flex items-center justify-center p-6">
      <div className="stone-board stone-noise mono relative w-full max-w-[1200px] p-6 pb-24 text-[12px] text-[var(--copper-1)]">
        <svg className="vine" viewBox="0 0 1060 42" preserveAspectRatio="none" aria-hidden="true">
          <path d="M40 8 C120 25, 175 0, 248 13 S365 28, 445 11 S570 3, 657 12 S790 25, 874 9 S965 3, 1020 16" stroke="#7d6a42" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M175 0 C184 16, 171 25, 179 41" stroke="#6c7542" strokeWidth="3" fill="none" />
          <path d="M512 4 C525 16, 518 28, 526 40" stroke="#6c7542" strokeWidth="3" fill="none" />
          <path d="M905 2 C918 13, 910 24, 917 39" stroke="#6c7542" strokeWidth="3" fill="none" />
        </svg>

        <HeaderBrand version="7.4" showVersion />

        <div className="grid grid-cols-1 lg:grid-cols-[88px_188px_1fr_208px] gap-6 mt-6">
          {/* Nav rail */}
          <section className="flex lg:flex-col flex-row flex-wrap gap-4">
            <StoneTile isActive icon="lucide:target" title="Goals" subtitle="On-line Status" href="/ws/goals" />
            <StoneTile isActive={false} icon="lucide:activity" title="Sports" subtitle="NPL-9 [Syncing]" href="/hs/sports" />
            <StoneTile isActive={false} icon="lucide:wrench" title="Tools" subtitle="Recon-3 [Ready]" href="/ws/tools" />
          </section>

          {/* Goal detail + triggers */}
          <section>
            <CopperPanel title="GOAL DETAIL" subtitle="PIPELINE_ALPHA" subtext="(Live Feed)">
              <div className="space-y-1 text-[10px] leading-snug text-[var(--copper-0)]">
                <div>SUB-GOAL 1.1: SIGNAL_INTERROGATION</div>
                <div className="pl-3">├ TASK: [DECODE_SIGNAL]</div>
                <div className="pl-3">└ TIMELINE: <span className="float-right">INSTANT</span></div>
                <div className="mt-2">SUB-GOAL 1.2: BIOMETRIC_TRACE</div>
                <div className="pl-3">├ TASK: [DECODE_BIOMETRICS]</div>
                <div className="pl-3">└ TIMELINE: <span className="float-right">34m</span></div>
                <div className="mt-2">SUB-GOAL 1.3: TRACK_LOCK</div>
                <div className="pl-3">└ TIMELINE: <span className="float-right">ONGOING</span></div>
              </div>
              <div className="my-4 border-t border-[var(--stone-3)]" />
              <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--copper-2)]">Triggers:</div>
              <div className="space-y-3 text-[11px] text-[var(--copper-1)]">
                <div className="flex items-center gap-2"><Search size={17} /><span>[EVENT_CAPTURE]</span></div>
                <div className="flex items-center gap-2"><Bug size={17} /><span>[SIG_DECODE]</span></div>
                <div className="flex items-center gap-2"><ScanLine size={17} /><span>[REACTION_MATRIX]</span></div>
              </div>
            </CopperPanel>
          </section>

          {/* Pipeline + sensor logs */}
          <section className="grid grid-rows-[332px_126px] gap-4">
            <CopperPanel title="GOAL DETAIL" subtitle="[PIPELINE_ALPHA]">
              <div className="mb-4 text-[13px] text-[var(--copper-2)]">STATUS: In-Progress (65%)</div>
              <div className="grid grid-cols-[190px_1fr] gap-4">
                <div className="h-[248px]">
                  <PipelineDiagram isProcessing />
                </div>
                <div className="space-y-3 pt-2 text-[12px] leading-relaxed text-[var(--copper-0)]">
                  <div>
                    <div className="text-[14px] text-[var(--copper-2)]">STAGE 1: SIG_INT</div>
                    <div>- TASK: [SIGNAL_INTEGRATION]</div>
                    <div>- TASK: [DECODE_SIGNAL]</div>
                  </div>
                  <div>
                    <div className="text-[14px] text-[var(--copper-2)]">STAGE 2: BIOMETRIC_HUNT</div>
                    <div>- TASK: [DECODE_BIOMETRICS]</div>
                    <div>- TASK: [TRACE_MATCH]</div>
                  </div>
                  <div>
                    <div className="text-[14px] text-[var(--copper-2)]">STAGE 3: TRACK_LOCK</div>
                    <div>- TASK: [SIG_INT]</div>
                    <div>- TASK: [POSITION_HUNT]</div>
                  </div>
                  <div>
                    <div className="text-[14px] text-[var(--copper-2)]">STAGE 4: SIG_DECODE</div>
                    <div>- TASK: [CROSS_DECODE]</div>
                    <div>- TASK: [CONFIRM_HUNT]</div>
                  </div>
                </div>
              </div>
            </CopperPanel>

            <div className="grid grid-cols-[1fr_116px] gap-4">
              <CopperPanel title="SENSOR ARRAY LOGS">
                <div className="space-y-2 text-[11px] text-[var(--copper-2)]">
                  <div>AMBIENT TEMP: 28°C</div>
                  <div>BIOMETRIC SIGNATURE:</div>
                  <div>Anomalous Trace Detected</div>
                  <div>HUMIDITY: 96%</div>
                </div>
              </CopperPanel>
              <CopperPanel title="SQUATCH_PROFILE" subtitle="[DECODED]">
                <WireframeProfile compact confidenceLevel={93} sectorCode="JG-07" />
              </CopperPanel>
            </div>
          </section>

          {/* Metrics + profile */}
          <section className="space-y-4">
            <CopperPanel title="METRICS TILES">
              <div className="space-y-0 text-[12px]">
                <div className="flex items-center gap-3 border-b border-[var(--stone-3)] py-3">
                  <Clock3 size={20} className="text-[var(--copper-1)]" />
                  <div>
                    <div className="text-[var(--copper-2)]">[UPTIME %]</div>
                    <div className="text-[28px] leading-none text-[var(--copper-2)]">99.0%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-[var(--stone-3)] py-3">
                  <AlertTriangle size={20} className="text-[var(--copper-1)]" />
                  <div>
                    <div className="text-[var(--copper-2)]">[ALERTS]</div>
                    <div className="text-[28px] leading-none text-[var(--copper-2)]">0</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-[var(--stone-3)] py-3">
                  <Network size={20} className="text-[var(--copper-1)]" />
                  <div>
                    <div className="text-[var(--copper-2)]">[THROUGHPUT]</div>
                    <div className="text-[28px] leading-none text-[var(--copper-2)]">15TB/s</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-[var(--stone-3)] py-3">
                  <ShieldCheck size={20} className="text-[var(--copper-1)]" />
                  <div>
                    <div className="text-[var(--copper-2)]">[BACKUP]</div>
                    <div className="text-[28px] leading-none text-[var(--copper-2)]">99%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <Fingerprint size={18} className="text-[var(--copper-1)]" />
                  <div className="text-[13px] text-[var(--copper-2)]">REDSQUATCH_SIG</div>
                </div>
              </div>
            </CopperPanel>

            <CopperPanel title="SQUATCH_PROFILE">
              <WireframeProfile isAnomalous confidenceLevel={93} sectorCode="JG-07" scanSignature="SQ-ALPHA" />
            </CopperPanel>
          </section>
        </div>

        <BottomToolbar activeItem="dashboard" />
      </div>
    </div>
  );
}
