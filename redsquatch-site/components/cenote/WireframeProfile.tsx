'use client';

interface WireframeProfileProps {
  isAnomalous?: boolean;
  confidenceLevel: number;
  sectorCode: string;
  scanSignature?: string;
}

export default function WireframeProfile({
  isAnomalous = false,
  confidenceLevel,
  sectorCode,
  scanSignature,
}: WireframeProfileProps) {
  return (
    <div className="border border-[var(--stone-3)] p-3" style={{ borderRadius: '0.5rem' }}>
      <svg width="100%" height="90" viewBox="0 0 160 90" aria-hidden="true">
        <path
          d="M20 70 Q40 20 60 60 Q75 10 90 55 Q105 25 130 70"
          fill="none"
          stroke="var(--copper-1)"
          strokeWidth="1"
        />
        <path
          d="M20 78 Q50 60 80 78 T140 78"
          fill="none"
          stroke="var(--stone-3)"
          strokeWidth="1"
        />
        <path
          d="M15 55 Q60 45 145 55"
          fill="none"
          stroke="var(--stone-3)"
          strokeWidth="1"
        />
      </svg>
      <div className="mono flex items-center justify-between text-[10px] mt-2">
        <span className="text-[var(--copper-0)]">SECTOR: <span className="text-[var(--copper-2)]">{sectorCode}</span></span>
        <span className="text-[var(--copper-0)]">CONF: <span className="text-[var(--copper-2)]">{confidenceLevel}%</span></span>
      </div>
      {scanSignature && (
        <div className="mono text-[10px] text-[var(--copper-0)] mt-1">SIG: <span className="text-[var(--copper-2)]">{scanSignature}</span></div>
      )}
      {isAnomalous && (
        <div className="mono text-[10px] uppercase tracking-[0.1em] text-red-500 mt-2 border-t border-[var(--stone-3)] pt-2">
          ⚠ Active Anomaly
        </div>
      )}
    </div>
  );
}
