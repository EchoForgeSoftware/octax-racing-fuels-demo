import { BASE_PATH } from "./site.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: BASE_PATH,
  trailingSlash: true,
  images: {
    // GitHub Pages is static: no image optimisation server.
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  eslint: {
    // No ESLint config is shipped; type safety is enforced by the TS build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
