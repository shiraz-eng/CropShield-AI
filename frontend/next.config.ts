import type { NextConfig } from "next";

const config: NextConfig = {
  agentRules: false,
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "32mb" } },
};

export default config;
