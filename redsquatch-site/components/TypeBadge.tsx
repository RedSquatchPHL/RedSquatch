'use client';

const TYPE_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  DFCT: { bg: 'rgba(153, 101, 21, 0.16)',  border: '#996515', color: '#c9922e' }, // dark-gold
  ENHC: { bg: 'rgba(184, 115, 51, 0.16)',  border: '#b87333', color: '#b87333' }, // copper
  STRY: { bg: 'rgba(212, 163, 115, 0.16)', border: '#d4a373', color: '#d4a373' }, // light-copper
  STSK: { bg: 'rgba(184, 115, 51, 0.08)',  border: 'rgba(184, 115, 51, 0.45)', color: 'rgba(212, 163, 115, 0.75)' }, // muted copper
  RLSE: { bg: 'rgba(224, 138, 60, 0.20)',  border: '#e08a3c', color: '#e08a3c' }, // bright copper
  SNWR: { bg: 'rgba(184, 115, 51, 0.06)',  border: 'rgba(184, 115, 51, 0.30)', color: 'rgba(184, 115, 51, 0.55)' }, // dim copper
};

const FALLBACK = { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' };

export default function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? FALLBACK;
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.85rem',
        fontWeight: 600,
        padding: '0.1rem 0.5rem',
        borderRadius: 0,
        border: `2px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        letterSpacing: '0.02em',
      }}
    >
      {type}
    </span>
  );
}
