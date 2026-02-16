/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // GitHub Pages: static export + basePath for project site (e.g. /D2RLootFilters/)
  ...(process.env.GITHUB_ACTIONS && {
    output: "export",
    basePath: "/D2RLootFilters",
    assetPrefix: "/D2RLootFilters/",
  }),
  ...(!process.env.GITHUB_ACTIONS && { output: "standalone" }),
};

module.exports = nextConfig;
