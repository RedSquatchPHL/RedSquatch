'use client';

interface WireframeProfileProps {
  isAnomalous?: boolean;
  confidenceLevel: number;
  sectorCode: string;
  scanSignature?: string;
  /** Small footer-less variant for tight layouts (e.g. paired next to a sensor-log panel). */
  compact?: boolean;
}

export default function WireframeProfile({
  isAnomalous = false,
  confidenceLevel,
  sectorCode,
  scanSignature,
  compact = false,
}: WireframeProfileProps) {
  if (compact) {
    return (
      <svg viewBox="0 0 100 82" className="h-[70px] w-full" aria-hidden="true">
        <path d="M10 44 C25 20, 48 12, 88 34 C72 54, 45 67, 14 57 Z" className="wire" />
        <path d="M14 57 C34 34, 58 26, 86 41" className="wire-thin" />
        <path d="M22 48 C39 31, 58 27, 76 37" className="wire-thin" />
        <path d="M18 50 C34 54, 49 61, 66 70" className="wire-thin" />
        <path d="M34 29 C42 42, 46 54, 50 67" className="wire-thin" />
        <path d="M50 22 C54 36, 58 49, 64 60" className="wire-thin" />
        <path d="M65 26 C63 40, 59 54, 54 69" className="wire-thin" />
      </svg>
    );
  }

  return (
    <div className="relative h-[160px] overflow-hidden rounded-[8px] border border-[var(--stone-3)] bg-[radial-gradient(circle_at_50%_70%,rgba(52,97,77,0.28),transparent_48%),linear-gradient(180deg,#0f1110,#11110f)] px-2 py-2">
      {isAnomalous && (
        <div className="absolute right-2 top-2 text-right text-[10px] uppercase leading-none text-red-500">
          <div>ACTIVE</div>
          <div>ANOMALY</div>
        </div>
      )}
      <svg viewBox="0 0 190 140" className="h-full w-full" aria-hidden="true">
        <path d="M18 72 C40 28, 88 18, 170 64 C145 104, 96 122, 28 102 Z" className="wire" />
        <path d="M24 78 C52 42, 96 34, 164 70" className="wire-thin" />
        <path d="M30 85 C58 49, 98 42, 154 76" className="wire-thin" />
        <path d="M38 91 C62 58, 98 50, 148 82" className="wire-thin" />
        <path d="M48 96 C70 67, 101 60, 141 87" className="wire-thin" />
        <path d="M58 100 C79 74, 104 68, 136 92" className="wire-thin" />
        <path d="M32 56 C60 74, 83 93, 106 114" className="wire-thin" />
        <path d="M49 41 C70 63, 90 85, 113 108" className="wire-thin" />
        <path d="M69 31 C84 55, 97 77, 115 102" className="wire-thin" />
        <path d="M92 24 C97 49, 100 73, 102 110" className="wire-thin" />
        <path d="M115 26 C110 48, 106 70, 98 110" className="wire-thin" />
        <path d="M137 36 C125 58, 113 79, 95 111" className="wire-thin" />
        <path d="M155 49 C136 68, 119 88, 98 110" className="wire-thin" />
      </svg>
      <div className="mono absolute bottom-2 left-2 text-[7px] leading-tight text-[var(--copper-0)]">
        SCAN: BIOMETRIC_SIG<br />
        SECTOR: {sectorCode}<br />
        TRACE CONFIDENCE: {confidenceLevel}%
        {scanSignature && <><br />SIG: {scanSignature}</>}
      </div>
    </div>
  );
}
