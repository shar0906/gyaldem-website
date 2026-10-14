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
  // An Ode To Her's link was briefly /ladies-night/ode-to-her.
  async redirects() {
    return [{ source: "/ladies-night/ode-to-her", destination: "/ladies-night/an-ode-to-her", permanent: true }];
  },
};

export default nextConfig;