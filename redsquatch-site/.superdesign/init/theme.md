# Theme — RedSquatch (Next.js 13 App Router, Tailwind, CSS Modules)

Framework: Next.js 13 (App Router) + React, Tailwind CSS, plain CSS files + one CSS Module (`copper-panel.module.css`), `lucide-react@0.105.0-alpha.4` icons, `framer-motion` (HS dock only).

## `tailwind.config.js` (full)
```js
const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        'ctx-accent': 'var(--ctx-accent)',
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: { sans: ["var(--font-sans)", ...fontFamily.sans] },
      keyframes: {
        "accordion-down": { from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## `styles/cenote-tokens.css` (full — the command-center token source of truth)
```css
:root {
  --stone-0: #141210;
  --stone-1: #231c18;
  --stone-2: #3a3029;
  --stone-3: #5f4c3c;
  --copper-0: #8e633f;
  --copper-1: #b88b63;
  --copper-2: #ddb08a;
  --copper-glow-rgb: 237, 179, 126;
  --moss: #4d6347;
  --jade: #1a3d35;

  --obsidian-void: #0d100d;
  --stone-wall: var(--stone-1);
  --copper-ceremonial: var(--copper-0);
  --copper-warm: var(--copper-2);
  --jade-accent: var(--moss);
  --jade-shadow: var(--jade);
  --gold-relief: #996515;

  --font-header: 'Stardom', serif;
  --font-ui: 'Inter', sans-serif;
  --font-data: 'JetBrains Mono', monospace;
  --font-console: 'JetBrains Mono', monospace;

  --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px; --space-2xl: 48px;

  --shadow-ambient: 0 12px 32px rgba(0, 0, 0, 0.4);
  --shadow-card: 0 8px 16px rgba(0, 0, 0, 0.3);
  --shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -2px 4px rgba(0, 0, 0, 0.3);

  --copper-glow: rgba(var(--copper-glow-rgb), 0.38);
  --glow-copper: 0 0 12px rgba(var(--copper-glow-rgb), 0.4);
  --glow-jade: 0 0 8px rgba(77, 99, 71, 0.2);

  --border-copper: 1px solid rgba(var(--copper-glow-rgb), 0.3);
  --border-copper-bold: 1px solid rgba(var(--copper-glow-rgb), 0.6);
  --border-jade: 1px solid rgba(77, 99, 71, 0.2);

  --radius-cenote: 0;
  --radius-cenote-subtle: 2px;
  --radius-command: 1rem;
}
```

## `styles/cenote-elements.css` — WS command-center chrome section (full)
```css
.mono { font-family: var(--font-console); }
.glyph { font-family: var(--font-header); }

.jungle-bg {
  background-image:
    radial-gradient(circle at 50% 55%, rgba(85, 120, 90, 0.18), transparent 22%),
    linear-gradient(rgba(6, 10, 8, 0.35), rgba(6, 10, 8, 0.55)),
    url('/images/underground-cenote-bg.png');
  background-size: cover;
  background-position: center;
}

.stone-board {
  position: relative;
  background: linear-gradient(180deg, rgba(68, 54, 43, 0.18), rgba(12, 10, 9, 0.4)),
              linear-gradient(135deg, #181513, #0d0c0b 45%, #1b1714 100%);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55),
              inset 0 1px 0 rgba(255, 226, 194, 0.06),
              inset 0 -2px 0 rgba(0, 0, 0, 0.65);
  border: 2px solid var(--stone-1);
  border-radius: var(--radius-command);
}

.lit-tile {
  background:
    radial-gradient(circle at 50% 35%, rgba(238, 163, 102, 0.18), transparent 65%),
    linear-gradient(180deg, #4e3f34 0%, #29221c 20%, #171412 100%);
  border: 1px solid rgba(221, 177, 137, 0.48);
  box-shadow: 0 0 0 1px rgba(255, 208, 167, 0.08) inset, 0 0 18px rgba(236, 154, 91, 0.18), inset 0 -8px 18px rgba(0, 0, 0, 0.4);
}

.stone-tile {
  background: linear-gradient(180deg, #5f554d 0%, #433a35 30%, #2d2824 100%);
  border: 1px solid rgba(132, 108, 89, 0.9);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.07), inset 0 -8px 16px rgba(0, 0, 0, 0.25);
}

.toolbar-shadow { box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35); }
.glow-text { text-shadow: 0 0 10px rgba(var(--copper-glow-rgb), 0.4); }
```
(Full file also has `.stone-noise`, `.glow-line`/`.glow-solid`/`.stage-box`/`.wire`/`.wire-thin` for SVG diagrams, `.vine`, `.scan`, `.pulsing-value` — omitted here, not relevant to a toolbar button.)

## `components/cenote/copper-panel.module.css` (full)
```css
.copperPanel {
  position: relative;
  padding: var(--space-lg, 24px);
  background: linear-gradient(135deg, rgba(26, 24, 22, 0.7), rgba(15, 15, 15, 0.9));
  border: 1px solid rgba(var(--copper-glow-rgb), 0.4);
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -2px 4px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.3);
}
.copperPanel::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(156, 119, 83, 0.25);
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  pointer-events: none;
}
.title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-copper-bright); font-family: var(--font-mono); margin-bottom: 8px; }
.subtitle { font-size: 12px; color: rgba(222, 179, 135, 0.9); font-family: var(--font-mono); margin-bottom: 8px; }
.subtext { font-size: 11px; color: rgba(207, 159, 114, 0.9); font-style: italic; font-family: var(--font-mono); margin-bottom: 12px; }
.content { position: relative; z-index: 10; }
```
