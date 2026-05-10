import type { Metadata } from "next";
import { Geist, Fraunces, Space_Mono, VT323, Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Fraunces: optical-size variable serif — editorial, distinctive, not top-25
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

// Space Mono: angular, retro-technical — pairs with editorial serif perfectly
const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Pixel fonts for animated wordmark
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
  title: { default: "Saves", template: "%s · Saves" },
  description: "Your personal recommendation library.",
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
    title: "Saves",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#0a0f1c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${fraunces.variable} ${spaceMono.variable} ${vt323.variable} ${pixelifySans.variable} ${silkscreen.variable} antialiased`}>

        {/* Jewel atmosphere — orbs are deliberately visible, not subtle */}
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden"
          style={{ background: 'oklch(0.10 0.09 262)' }}>

          {/* Teal-emerald: top-left anchor */}
          <div className="gradient-orb" style={{
            width: 900, height: 900, top: -250, left: -250,
            background: 'radial-gradient(circle at 40% 40%, #0f9d8a 0%, #0a6b5e 40%, transparent 70%)',
            filter: 'blur(60px)', opacity: 0.45,
            animation: 'orb-1 34s ease-in-out infinite',
          }} />

          {/* Amber-gold: bottom-right */}
          <div className="gradient-orb" style={{
            width: 800, height: 800, bottom: -220, right: -200,
            background: 'radial-gradient(circle at 55% 55%, #d97706 0%, #92400e 45%, transparent 70%)',
            filter: 'blur(55px)', opacity: 0.40,
            animation: 'orb-2 42s ease-in-out infinite',
          }} />

          {/* Ruby: upper-right */}
          <div className="gradient-orb" style={{
            width: 620, height: 620, top: '8%', right: -120,
            background: 'radial-gradient(circle at 45% 45%, #be123c 0%, #881337 45%, transparent 70%)',
            filter: 'blur(60px)', opacity: 0.35,
            animation: 'orb-3 28s ease-in-out infinite',
          }} />

          {/* Deep violet: center-left */}
          <div className="gradient-orb" style={{
            width: 560, height: 560, top: '44%', left: '4%',
            background: 'radial-gradient(circle at 50% 50%, #6d28d9 0%, #4c1d95 45%, transparent 70%)',
            filter: 'blur(65px)', opacity: 0.30,
            animation: 'orb-4 48s ease-in-out infinite',
          }} />

          {/* Sapphire: bottom-center */}
          <div className="gradient-orb" style={{
            width: 500, height: 500, bottom: '10%', left: '30%',
            background: 'radial-gradient(circle at 50% 50%, #1d4ed8 0%, #1e3a8a 45%, transparent 70%)',
            filter: 'blur(70px)', opacity: 0.25,
            animation: 'orb-1 55s ease-in-out infinite reverse',
          }} />

          {/* Grain overlay — adds tactile depth */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }} />
        </div>

        {children}
      </body>
    </html>
  );
}
