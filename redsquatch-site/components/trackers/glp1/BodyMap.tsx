'use client';

import { SITES, SITE_LABEL, type Site, type SiteStatus } from '@/lib/glp1';

// Front view, drawn as you see yourself in a mirror's absence: the figure's left
// side is on the viewer's left (same convention as the original tracker), so
// "Left" is the zone on the left of the picture.
const COLS = [76, 93, 110];
const ROWS = [84, 104, 124];
const cell = (c: number, r: number) => ({ x: COLS[c], y: ROWS[r], w: 15, h: 18, rx: 5 });

const ZONES: Record<Site, { x: number; y: number; w: number; h: number; rx: number }> = {
  abdomen_ul: cell(0, 0), abdomen_um: cell(1, 0), abdomen_ur: cell(2, 0),
  abdomen_ml: cell(0, 1), abdomen_mr: cell(2, 1),
  abdomen_ll: cell(0, 2), abdomen_lm: cell(1, 2), abdomen_lr: cell(2, 2),
  flank_l: { x: 63, y: 92, w: 11, h: 46, rx: 5 },
  flank_r: { x: 126, y: 92, w: 11, h: 46, rx: 5 },
  arm_l: { x: 40, y: 64, w: 18, h: 44, rx: 8 },
  arm_r: { x: 142, y: 64, w: 18, h: 44, rx: 8 },
  thigh_l: { x: 71, y: 166, w: 26, h: 58, rx: 10 },
  thigh_r: { x: 103, y: 166, w: 26, h: 58, rx: 10 },
};

const DAY = 86400000;

// How recently a site was used → fill. Recent use is warm (avoid), long-rested is
// green (go), never-used is neutral-green.
function heat(lastUsed: number | null, now: number): { fill: string; stroke: string } {
  if (lastUsed === null) return { fill: 'rgba(76,175,80,0.35)', stroke: '#4caf50' };
  const days = (now - lastUsed) / DAY;
  if (days < 7) return { fill: 'rgba(200,80,80,0.45)', stroke: '#c85050' };
  if (days < 14) return { fill: 'rgba(217,160,54,0.4)', stroke: '#d9a036' };
  return { fill: 'rgba(76,175,80,0.35)', stroke: '#4caf50' };
}

function daysLabel(lastUsed: number | null, now: number): string {
  if (lastUsed === null) return 'never';
  const d = Math.floor((now - lastUsed) / DAY);
  return d <= 0 ? 'today' : `${d}d`;
}

export default function BodyMap({
  statuses, recommended, selected, onSelect,
}: {
  statuses: SiteStatus[];
  recommended: Site | null;
  selected?: Site | null;
  onSelect?: (site: Site) => void;
}) {
  const now = Date.now();
  const byId = new Map(statuses.map(s => [s.site, s]));
  const body = { fill: 'rgba(212,163,115,0.07)', stroke: 'rgba(212,163,115,0.45)', strokeWidth: 1.5 };

  return (
    <svg viewBox="0 0 200 300" role="group" aria-label="Injection site map" className="w-full max-w-[240px] mx-auto">
      {/* Silhouette */}
      <circle cx="100" cy="28" r="17" {...body} />
      <rect x="92" y="43" width="16" height="12" rx="4" {...body} />
      <path d="M60 58 Q100 46 140 58 L136 152 Q100 162 64 152 Z" {...body} />
      <rect x="36" y="58" width="26" height="96" rx="13" {...body} />
      <rect x="138" y="58" width="26" height="96" rx="13" {...body} />
      <rect x="66" y="150" width="32" height="138" rx="15" {...body} />
      <rect x="102" y="150" width="32" height="138" rx="15" {...body} />
      <circle cx="100" cy="113" r="2" fill="rgba(212,163,115,0.5)" />

      {SITES.map(site => {
        const z = ZONES[site];
        const st = byId.get(site);
        const { fill, stroke } = heat(st?.lastUsed ?? null, now);
        const isRec = site === recommended;
        const isSel = site === selected;
        const cx = z.x + z.w / 2;
        const cy = z.y + z.h / 2;
        return (
          <g
            key={site}
            role="button"
            tabIndex={onSelect ? 0 : -1}
            aria-label={`${SITE_LABEL[site]}, last used ${daysLabel(st?.lastUsed ?? null, now)}${isRec ? ', recommended next' : ''}`}
            aria-pressed={isSel}
            style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
            onClick={() => onSelect?.(site)}
            onKeyDown={e => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(site); } }}
          >
            {isRec && (
              <rect x={z.x - 3} y={z.y - 3} width={z.w + 6} height={z.h + 6} rx={z.rx + 3} fill="none" stroke="#d4a373" strokeWidth="1.5" strokeDasharray="3 2">
                <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
              </rect>
            )}
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={z.rx} fill={fill} stroke={isSel ? '#fff' : stroke} strokeWidth={isSel ? 2.5 : 1.5} />
            <title>{SITE_LABEL[site]}</title>
            <text x={cx} y={cy + 2.5} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.8)" pointerEvents="none">
              {daysLabel(st?.lastUsed ?? null, now)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
