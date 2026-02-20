/** @type {import('next').NextConfig} */
const basePath = process.env.GITHUB_ACTIONS ? "/D2RLootFilters" : "";
const nextConfig = {
  reactStrictMode: true,
  // Expose basePath and static build flag to client
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_BUILD: process.env.GITHUB_ACTIONS ? "true" : "",
  },
  ...(process.env.GITHUB_ACTIONS && {
    output: "export",
    basePath,
    assetPrefix: `${basePath}/`,
  }),
  ...(!process.env.GITHUB_ACTIONS && { output: "standalone" }),
};

module.exports = nextConfig;
