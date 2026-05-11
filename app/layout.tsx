import type { Metadata } from "next";
import { Geist, Fraunces, Space_Mono, VT323, Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
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
// See components/animated-wordmark.tsx for the cycle sequence.
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
  metadataBase: new URL("https://saves.dylandibona.com"),
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
          ${geist.variable}
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
