import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Next.js <Image> to load any HTTPS image. We surface external
    // hero images from Instagram CDN, Google Maps photos, recipe sites,
    // article thumbnails, etc. — the set of source domains is open-ended.
    // If we ever want to lock this down, swap '**' for an explicit list.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
