import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image: `node server.js`.
  output: "standalone",
  // Native module, must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // Old URLs from before the redesign keep working (temporary, so they can change again).
  async redirects() {
    return [
      { source: "/check", destination: "/upload", permanent: false },
      { source: "/account", destination: "/settings", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
