'use client';

// A quiet strip of papel picado bunting across the top of the header — cut-
// paper pennants on a string, each with a watercolor-soft edge (a blurred
// wide stroke behind a crisp thin one) and a couple of punched-out "light"
// holes, rather than a flat colored shape. Purely festive: colors cycle
// through a traditional papel picado palette and don't tie to anything else
// on the page. Kept deliberately faint (opacity on the wrapping <svg>) so it
// reads as trim, not a hero graphic.

const FLAG_COLORS = ['#e94f8a', '#f4a627', '#f4c430', '#2a9d8f', '#4a7fc9', '#8e5b9f'];
const FLAG_COUNT = 9;
const VIEW_W = 720;
const VIEW_H = 56;
const FLAG_W = 52;
const FLAG_H = 38;
const STRING_Y = 10;
const SAG = 9;

function flagPath(w: number, h: number) {
  const half = w / 2;
  return `M ${-half},0 L ${half},0 L ${half - 3},${h * 0.58}
    Q ${half * 0.45},${h} ${half * 0.15},${h * 0.62}
    Q 0,${h * 0.32} ${-half * 0.15},${h * 0.62}
    Q ${-half * 0.45},${h} ${-(half - 3)},${h * 0.58} Z`;
}

export default function PapelPicadoBanner({ className }: { className?: string }) {
  const spacing = VIEW_W / FLAG_COUNT;
  const stringPoints: string[] = [];
  for (let i = 0; i <= FLAG_COUNT; i++) {
    const x = i * spacing;
    const y = STRING_Y + (i % 2 === 0 ? 0 : SAG);
    stringPoints.push(`${i === 0 ? 'M' : 'Q'} ${x - (i === 0 ? 0 : spacing / 2)},${y + SAG} ${x},${y}`);
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="picado-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>

      <path d={stringPoints.join(' ')} fill="none" stroke="#8a6a4a" strokeWidth="1.25" opacity="0.55" />

      {Array.from({ length: FLAG_COUNT }).map((_, i) => {
        const x = (i + 0.5) * spacing;
        const y = STRING_Y + (i % 2 === 0 ? SAG * 0.5 : SAG);
        const color = FLAG_COLORS[i % FLAG_COLORS.length];
        const d = flagPath(FLAG_W, FLAG_H);
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            {/* watercolor bleed: wide blurred stroke behind a crisp thin one */}
            <path d={d} fill="none" stroke={color} strokeWidth="5" opacity="0.3" filter="url(#picado-soft)" />
            <path d={d} fill={color} fillOpacity="0.42" stroke={color} strokeWidth="1.1" opacity="0.85" />
            {/* punched "light" holes */}
            <circle cx="0" cy={FLAG_H * 0.32} r="2.6" fill="#fffdf8" opacity="0.55" />
            <circle cx="-9" cy={FLAG_H * 0.5} r="1.8" fill="#fffdf8" opacity="0.45" />
            <circle cx="9" cy={FLAG_H * 0.5} r="1.8" fill="#fffdf8" opacity="0.45" />
          </g>
        );
      })}
    </svg>
  );
}
