'use client';

interface PipelineDiagramProps {
  isProcessing: boolean;
}

export default function PipelineDiagram({ isProcessing }: PipelineDiagramProps) {
  return (
    <svg width="220" height="48" viewBox="0 0 220 48" aria-hidden="true">
      {[0, 1, 2].map(i => (
        <rect
          key={i}
          x={10 + i * 75}
          y="14"
          width="30"
          height="20"
          fill="none"
          stroke="var(--copper-1)"
          strokeWidth="1"
        />
      ))}
      <line x1="40" y1="24" x2="85" y2="24" stroke="var(--copper-0)" strokeWidth="1" />
      <line x1="115" y1="24" x2="160" y2="24" stroke="var(--copper-0)" strokeWidth="1" />
      {isProcessing && (
        <>
          <circle r="2" fill="var(--copper-2)">
            <animateMotion dur="1.6s" repeatCount="indefinite" path="M40,24 L85,24" />
          </circle>
          <circle r="2" fill="var(--copper-2)">
            <animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite" path="M115,24 L160,24" />
          </circle>
        </>
      )}
    </svg>
  );
}
