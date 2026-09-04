import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Screenshot uploads go through server actions (multipart FormData).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
