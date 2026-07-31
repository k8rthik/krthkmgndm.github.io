import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't pick up a stray lockfile
  // in a parent directory.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
