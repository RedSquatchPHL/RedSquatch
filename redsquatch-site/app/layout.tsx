import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/cenote-variables.css";
import "@/styles/cenote-background.css";
import { ThemeProvider } from "@/components/ThemeContext";
import GlobalEffects from "@/components/GlobalEffects";

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
      <body className={inter.className}>
        <ThemeProvider>
          <GlobalEffects />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
