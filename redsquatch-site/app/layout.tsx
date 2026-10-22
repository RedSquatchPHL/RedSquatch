import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
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
  description: "Command center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        {/* Cabinet Grotesk + Satoshi — Tonatiuh OS reskin typography for /ws/*,
            sourced from Fontshare the same way the SuperDesign draft does. */}
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500,400&f[]=satoshi@500,400&display=swap" rel="stylesheet" />
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
