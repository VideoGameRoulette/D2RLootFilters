/** @type {import('next').NextConfig} */
const basePath = process.env.GITHUB_ACTIONS ? "/D2RLootFilters" : "";
const nextConfig = {
  reactStrictMode: true,
  // Expose basePath to client so fetch("/data/...") works on GitHub Pages
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(process.env.GITHUB_ACTIONS && {
    output: "export",
    basePath,
    assetPrefix: `${basePath}/`,
  }),
  ...(!process.env.GITHUB_ACTIONS && { output: "standalone" }),
};

module.exports = nextConfig;
