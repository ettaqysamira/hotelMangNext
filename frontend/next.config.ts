import type { NextConfig } from "next";

const frontendRoot = __dirname;

const nextConfig: NextConfig = {
  turbopack: {
    root: frontendRoot
  }
};

export default nextConfig;
