import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Space_Mono, VT323, Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

/**
 * Type system — see docs/design-direction.md §3 and research note in
 * NOTES.md (2026-05-11 typography pass).
 *
 * Primary sans: Bricolage Grotesque. Variable font with three axes:
 *   - wght (200-800)
 *   - wdth (75-100) — used at display sizes for condensed editorial feel
 *   - opsz (12-96)  — automatic via font-optical-sizing in CSS
 *
 * This face changes personality between body and display sizes the way
 * Geist (the previous sans) couldn't. We bind opsz=auto in CSS, and
 * explicit wght+wdth on display headings.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

// Fraunces — accent only. One deliberate italic word per surface.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

// Space Mono — small labels, metadata, timestamps.
const spaceMono = Space_Mono({
  variable: "--font-mono-space",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Pixel fonts — used ONLY in the cold-launch wordmark animation.
const vt323 = VT323({
  variable: "--font-pixel-a",
  subsets: ["latin"],
  weight: "400",
});
const pixelifySans = Pixelify_Sans({
  variable: "--font-pixel-b",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const silkscreen = Silkscreen({
  variable: "--font-pixel-c",
  subsets: ["latin"],
  weight: ["400", "700"],
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
  themeColor: "#1a1816",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`
          ${bricolage.variable}
          ${fraunces.variable}
          ${spaceMono.variable}
          ${vt323.variable}
          ${pixelifySans.variable}
          ${silkscreen.variable}
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}
