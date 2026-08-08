'use client';

interface AztecHeaderProps {
  label?: string;
}

/** Replaces HeaderBrand for the Aztec Command Center reskin: glitch wordmark
 *  over a faint rotating sun-stone watermark, framed by a step-fret frieze. */
export default function AztecHeader({ label = 'COMMAND CENTER' }: AztecHeaderProps) {
  return (
    <>
      <div className="ac-greca-band" aria-hidden="true" />
      <header className="ac-header">
        <div className="ac-sunstone-wrap" aria-hidden="true">
          <div className="ac-sunstone" />
        </div>
        <div className="ac-header-inner">
          <div className="ac-wordmark" data-text="REDSQUATCH">REDSQUATCH</div>
          <div className="ac-wordmark-sub">{label}</div>
        </div>
      </header>
    </>
  );
}
