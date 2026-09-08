import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Exam paper import allows files up to 30MB; leave headroom for
      // multipart/form-data overhead (boundaries, part headers, other fields).
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
