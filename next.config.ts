import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheMaxMemorySize: 10 * 1024 * 1024,
};

export default nextConfig;
