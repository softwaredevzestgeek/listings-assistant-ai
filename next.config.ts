import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in a parent dir confuses Turbopack's root detection;
  // pin the root to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
