import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // The GitHub Pages custom domain serves this export at /; no basePath or assetPrefix.
};

export default nextConfig;
