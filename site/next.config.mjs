import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The site lives in /site but imports the package straight from /src. */
const nextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
