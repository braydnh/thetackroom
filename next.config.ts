import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hwgcfhsnfalkbxpipumr.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google profile avatars (for Google OAuth users)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
