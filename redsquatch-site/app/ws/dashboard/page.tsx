'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="stone-board mono relative w-full max-w-[1200px] p-6 pb-24 text-[12px] text-[var(--copper-1)]">
        <HeaderBrand version="7.4" showVersion />

        <div className="grid grid-cols-1 lg:grid-cols-[100px_300px_1fr_240px] gap-6 mt-6">
          {/* Status tiles */}
          <section className="flex lg:flex-col flex-row flex-wrap gap-4">
            <StoneTile isActive icon="lucide:signal" title="SCAN" subtitle="ACTIVE" />
            <StoneTile isActive={false} icon="lucide:mic-2" title="AUDIO" subtitle="SILENT" />
            <StoneTile isActive icon="lucide:thermometer-sun" title="HEAT" subtitle="TRACED" />
          </section>

          {/* Sensor feeds + biometrics */}
          <section className="space-y-4">
            <CopperPanel title="SENSOR_FEEDS" subtitle="EM_TELEMETRY" subtext="Live Stream JG-07">
              <div className="space-y-3 pt-2">
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>FREQ_01:</span>
                  <span className="pulsing-value">432.48 MHz</span>
                </div>
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>STRENGTH:</span>
                  <span className="glow-text">-74.2 dBm</span>
                </div>
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>ANOMALY:</span>
                  <span className="text-red-500">DETECTED</span>
                </div>
                <div className="mt-4 text-[11px] leading-relaxed text-[var(--copper-2)] space-y-0.5">
                  <div>&gt;&gt; NOISE_FILTER_ACTIVE</div>
                  <div>&gt;&gt; RECON_DRONE_STATION_B</div>
                  <div>&gt;&gt; SIGNAL_STABILIZED</div>
                </div>
              </div>
            </CopperPanel>

            <CopperPanel title="BIOMETRICS" subtitle="SIGNATURE_MATCH" subtext="Trace #9012">
              <div className="space-y-3 pt-2">
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>HEARTBEAT:</span>
                  <span className="glow-text">42 BPM</span>
                </div>
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>VELOCITY:</span>
                  <span className="glow-text">12.4 km/h</span>
                </div>
                <div className="flex justify-between border-b border-[var(--stone-3)] pb-1">
                  <span>PATTERN:</span>
                  <span className="glow-text">ASYMMETRIC</span>
                </div>
                <div className="h-12 w-full mt-2 bg-[var(--stone-0)] border border-[var(--stone-3)] flex items-center justify-center">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <path d="M0 15 Q 10 0, 20 15 T 40 15 T 60 15 T 80 15 T 100 15" fill="none" stroke="var(--copper-2)" strokeWidth="1" />
                  </svg>
                </div>
              </div>
            </CopperPanel>
          </section>

          {/* Hunt workflow + target coords */}
          <section className="space-y-4">
            <CopperPanel title="HUNT_WORKFLOW" subtitle="PROCEDURAL_TRACKING" subtext="Current Phase: MATCH">
              <div className="flex flex-col items-center justify-center py-4">
                <PipelineDiagram isProcessing />
                <div className="grid grid-cols-3 w-full text-center text-[10px] mt-2 text-[var(--copper-2)]">
                  <div>SIG_DETECT</div>
                  <div>BIO_MATCH</div>
                  <div>TRACK_ACTIVE</div>
                </div>
              </div>
            </CopperPanel>

            <CopperPanel title="TARGET_COORDS" subtitle="GEOSPATIAL_FIX" subtext="Relative to Node-01">
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="space-y-2">
                  <div>LAT: <span className="glow-text">17.2224 N</span></div>
                  <div>LON: <span className="glow-text">89.1092 W</span></div>
                </div>
                <div className="space-y-2">
                  <div>DIST: <span className="pulsing-value">412.0m</span></div>
                  <div>ELEV: <span className="glow-text">224m</span></div>
                </div>
              </div>
            </CopperPanel>
          </section>

          {/* Tracking metrics + profile */}
          <section className="space-y-4">
            <CopperPanel title="TRACKING_METRICS" subtitle="OPERATIONAL_DATA" subtext="Node JG-07 Status">
              <div className="space-y-4 pt-2">
                <div className="border-b border-[var(--stone-3)] pb-2">
                  <div className="text-[10px] text-[var(--copper-0)]">UPTIME</div>
                  <div className="text-xl text-[var(--copper-2)]">99.98%</div>
                </div>
                <div className="border-b border-[var(--stone-3)] pb-2">
                  <div className="text-[10px] text-[var(--copper-0)]">LATENCY</div>
                  <div className="text-xl text-[var(--copper-2)]">14ms</div>
                </div>
                <div className="border-b border-[var(--stone-3)] pb-2">
                  <div className="text-[10px] text-[var(--copper-0)]">BACKUP</div>
                  <div className="text-xl text-[var(--copper-2)]">ACTIVE</div>
                </div>
              </div>
            </CopperPanel>

            <WireframeProfile isAnomalous confidenceLevel={97} sectorCode="JG-07" scanSignature="SQ-ALPHA" />
          </section>
        </div>

        <BottomToolbar activeItem="hunt" />
      </div>
    </div>
  );
}
