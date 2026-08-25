import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Local browser sessions may resolve the app through either loopback hostname.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
