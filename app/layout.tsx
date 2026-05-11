import type { Metadata } from "next";
import { Geist, Fraunces, Space_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Fraunces — kept as accent only. One or two deliberate emotional moments
// per screen, not the default heading face.
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});

// Space Mono — labels and meta only (small, all-caps tracking-widest).
const spaceMono = Space_Mono({
  variable: "--font-mono",
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
  themeColor: "#1a1c20",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${fraunces.variable} ${spaceMono.variable} antialiased`}
        style={{ background: 'oklch(0.10 0.005 240)' }}
      >
        {children}
      </body>
    </html>
  );
}
