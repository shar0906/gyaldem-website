import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // The staff manual reads its Markdown files at request time.
  outputFileTracingIncludes: {
    "/api/admin/manual": ["./content/manual/**"],
    "/api/admin/manual/technical": ["./content/manual/**"],
  },
};

export default nextConfig;