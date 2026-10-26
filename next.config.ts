import type { NextConfig } from "next";

// Sent with every response. The referrer policy still tells other sites which origin a visitor came from (for the footer credit's
// referral stats) but never the full path. No Content-Security-Policy: it needs tuning for the Next.js runtime and isn't worth it here.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // The admin sections are tabs on /admin now; keep the old addresses working.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return ["home", "about", "services"].map((tab) => ({ source: `/admin/${tab}`, destination: `/admin?tab=${tab}`, permanent: false }));
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
