'use client';

import { ReactNode } from 'react';

type GlyphFamily = 'fire' | 'codex' | 'water' | 'eagle';

interface AztecPanelProps {
  family: GlyphFamily;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * AztecPanel: carved-border card for the /ws/dashboard reskin.
 * The border is a real `border-image` (see styles/aztec-command.css,
 * `.ac-panel--<family>`), not a CSS `border` line — corners stay separate
 * stepped-pyramid glyphs so they don't double up with the edge pattern.
 * Glyph family carries meaning: fire = active work, eagle = goals/ascent,
 * codex = archive/record-keeping, water = infrastructure/inflow.
 */
export default function AztecPanel({ family, title, subtitle, children, className = '' }: AztecPanelProps) {
  return (
    <section className={`ac-panel ac-panel--${family} ${className}`} data-stagger>
      <span className="ac-corner ac-corner--tl" />
      <span className="ac-corner ac-corner--tr" />
      <span className="ac-corner ac-corner--bl" />
      <span className="ac-corner ac-corner--br" />
      {(title || subtitle) && (
        <div className="ac-panel-head">
          {title && <div className="ac-panel-title">{title}</div>}
          {subtitle && <div className="ac-panel-subtitle">{subtitle}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
