import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The product image validator allows up to 5 MB plus multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
