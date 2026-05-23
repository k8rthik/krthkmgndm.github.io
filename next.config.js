const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't pick up a stray lockfile
  // in a parent directory.
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
