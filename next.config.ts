import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  allowedDevOrigins: [
    "127.0.0.1",
    "agencies-studying-scheduling-somewhat.trycloudflare.com",
    "belongs-payroll-aging-often.trycloudflare.com",
  ],
};

export default nextConfig;
