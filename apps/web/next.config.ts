import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-news/ui", "@ai-news/types", "@ai-news/utils"],
};

export default withNextIntl(nextConfig);
