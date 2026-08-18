import { JetBrains_Mono as FontMono, Inter as FontSans, Playfair_Display as FontCocinaDisplay, DM_Sans as FontCocinaSans } from "next/font/google"

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
})

// Scoped to the Cocina applet only (see components/cocina/CocinaApp.tsx) —
// not the site-wide sans/mono pair above.
export const fontCocinaDisplay = FontCocinaDisplay({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cocina-display",
})

export const fontCocinaSans = FontCocinaSans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cocina-sans",
})
