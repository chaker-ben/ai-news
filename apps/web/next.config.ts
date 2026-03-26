import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@ai-news/ui", "@ai-news/types", "@ai-news/utils"],
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default withNextIntl(nextConfig);
