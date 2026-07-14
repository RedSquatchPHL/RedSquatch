import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/styles/globals.css";
import "@/styles/cenote-variables.css";
import "@/styles/cenote-background.css";
import "@/styles/cenote-tokens.css";
import "@/styles/cenote-elements.css";
import "@/styles/homesquatch-theme.css";
import { ThemeProvider } from "@/components/ThemeContext";
import { HomeSquatchGateProvider } from "@/components/HomeSquatchGate";
import GlobalEffects from "@/components/GlobalEffects";
import { GATE_BOOT_SCRIPT } from "@/lib/homesquatch-gate";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <head>
        {/* Runs before hydration so Work Mode / Downtime Mode is correct on first
            paint — avoids a flash of the wrong palette. See lib/homesquatch-gate.ts. */}
        <Script id="hs-gate-boot" strategy="beforeInteractive">
          {GATE_BOOT_SCRIPT}
        </Script>
      </head>
      <body className={inter.className}>
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
