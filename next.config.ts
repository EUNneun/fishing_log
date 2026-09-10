import type { NextConfig } from "next";

const repo = "/fishing_log";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: repo,
  assetPrefix: repo,
  images: { unoptimized: true },
};

export default nextConfig;
