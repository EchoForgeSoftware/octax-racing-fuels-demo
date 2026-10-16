import { BASE_PATH } from "./site.config.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Keep the watched preview separate from production-build artifacts.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
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
