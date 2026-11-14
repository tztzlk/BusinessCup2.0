import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image: `node server.js`.
  output: "standalone",
  // Native module, must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
};

export default nextConfig;
