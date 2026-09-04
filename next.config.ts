import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Screenshot uploads go through server actions (multipart FormData).
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    // Author avatars are SVGs; serve them through next/image with a script-free CSP.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
