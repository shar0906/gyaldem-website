import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        ".next/cache/**",
      ],
    },
  },
};

export default nextConfig;