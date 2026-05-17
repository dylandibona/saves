import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Martian_Mono } from "next/font/google";
import { Dock } from "@/components/dock";
import "./globals.css";

/**
 * Type system — Stratum v2 (2026-05-17).
 *
 *   Body / UI display sans  →  Instrument Sans (weights 400, 500)
 *   Editorial italic        →  Instrument Serif Italic — reserved for the
 *                              single-Find title moments only
 *                              (Capture once resolved + Detail title)
 *   Metadata / labels       →  Martian Mono (weights 400, 500), uppercase
 *                              at ≥ 0.12em letter-spacing for label cells
 *
 * Previous stack (Bricolage, Fraunces, Space Mono, Pixelify/VT323/Silkscreen)
 * removed; the animated pixel wordmark is being replaced by a sigil mark
 * in components/wordmark.tsx (Step 2 of the rollout).
 */
const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const martianMono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://finds.dylandibona.com"),
  title: { default: "Finds", template: "%s · Finds" },
  description: "The things you find, kept.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: {
    capable: true,
    title: "Finds",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#08080b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`
          ${instrumentSans.variable}
          ${instrumentSerif.variable}
          ${martianMono.variable}
          antialiased
        `}
      >
        {children}
        <Dock />
      </body>
    </html>
  );
}
