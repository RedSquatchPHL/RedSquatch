'use client';

interface PipelineDiagramProps {
  isProcessing: boolean;
}

export default function PipelineDiagram({ isProcessing }: PipelineDiagramProps) {
  const vertical = isProcessing ? 'glow-line' : 'glow-solid';

  return (
    <svg viewBox="0 0 190 248" className="h-full w-full" aria-hidden="true">
      {/* Trunk box */}
      <rect x="8" y="18" width="38" height="38" className="stage-box" />
      <path d="M46 37 H84" className={vertical} />
      <path d="M27 56 V95 H74" className="glow-solid" />

      {/* Stage 1–4 boxes down the right */}
      <rect x="84" y="22" width="24" height="24" className="stage-box" />
      <path d="M96 46 V95" className={vertical} />
      <rect x="84" y="95" width="24" height="24" className="stage-box" />
      <path d="M96 119 V160" className={vertical} />
      <rect x="84" y="160" width="24" height="24" className="stage-box" />
      <path d="M96 184 V220" className={vertical} />
      <rect x="84" y="220" width="24" height="24" className="stage-box" />

      {/* Connectors out to the stage labels */}
      <path d="M112 34 H154" className="glow-solid" />
      <path d="M108 108 H154" className="glow-solid" />
      <path d="M108 172 H154" className="glow-solid" />
      <path d="M108 232 H154" className="glow-solid" />
      <path d="M154 34 l-8 -5 M154 34 l-8 5" className="glow-solid" />
      <path d="M154 108 l-8 -5 M154 108 l-8 5" className="glow-solid" />
      <path d="M154 172 l-8 -5 M154 172 l-8 5" className="glow-solid" />
      <path d="M154 232 l-8 -5 M154 232 l-8 5" className="glow-solid" />
    </svg>
  );
}
