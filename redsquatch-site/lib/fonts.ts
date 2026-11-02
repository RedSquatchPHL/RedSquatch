import localFont from "next/font/local"

// Self-hosted (variable woff2, latin subset) rather than next/font/google: Google Fonts
// now serves extensionless font URLs that this Next version can't parse, which broke the
// Docker build on 2026-11-02. Scoped to the Cocina applet only (see components/cocina/CocinaApp.tsx).
export const fontCocinaDisplay = localFont({
  src: "../fonts/playfair-display-latin.woff2",
  weight: "500 700",
  variable: "--font-cocina-display",
  display: "swap",
})

export const fontCocinaSans = localFont({
  src: "../fonts/dm-sans-latin.woff2",
  weight: "400 700",
  variable: "--font-cocina-sans",
  display: "swap",
})
