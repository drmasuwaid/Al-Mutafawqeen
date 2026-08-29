import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  allowedDevOrigins: ["127.0.0.1", "*.trycloudflare.com"],
  poweredByHeader: false,
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
      { key: "CDN-Cache-Control", value: "no-store" },
    ];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      { source: "/", headers: noStore },
      { source: "/sw.js", headers: noStore },
    ];
  },
};

export default nextConfig;
