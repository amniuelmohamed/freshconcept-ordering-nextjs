import type { NextConfig } from "next";
import withNextIntl from "next-intl/plugin";

const withIntl = withNextIntl();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default withIntl(nextConfig);
