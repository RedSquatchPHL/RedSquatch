import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/styles/fonts.css";
import "@/styles/globals.css";
import "@/styles/cenote-variables.css";
import "@/styles/cenote-background.css";
import "@/styles/cenote-tokens.css";
import "@/styles/theme-tokens.css";
import "@/styles/cenote-elements.css";
import "@/styles/homesquatch-theme.css";
import "@/styles/hs-beach.css";
import { ThemeProvider } from "@/components/ThemeContext";
import { HomeSquatchGateProvider } from "@/components/HomeSquatchGate";
import GlobalEffects from "@/components/effects/GlobalEffects";
import { GATE_BOOT_SCRIPT } from "@/lib/homesquatch-gate";

// Fallback only: Satoshi (Fontshare) is the body face, see --rs-font-body in theme-tokens.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RedSquatch",
  description: "RedSquatch command center: work, goals, health and home in one private dashboard.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "RedSquatch",
    description: "Private command center.",
    siteName: "RedSquatch",
    type: "website",
  },
  // Matches the Tōnatiuh slate default (--rs-btn-ink); the downtime phases are set at runtime by the gate script.
  themeColor: "#0F1720",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Self-hosted faces (styles/fonts.css). Preload only what paints first:
            body copy and the heading weight. */}
        <link rel="preload" href="/fonts/satoshi-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/cabinet-grotesk-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Runs before hydration so Work Mode / Downtime Mode is correct on first
            paint — avoids a flash of the wrong palette. See lib/homesquatch-gate.ts. */}
        <Script id="hs-gate-boot" strategy="beforeInteractive">
          {GATE_BOOT_SCRIPT}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <HomeSquatchGateProvider>
            <GlobalEffects />
            {children}
          </HomeSquatchGateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
