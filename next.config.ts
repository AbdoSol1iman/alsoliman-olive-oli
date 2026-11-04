import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * libSQL ships a native SQLite binding for `file:` URLs (local dev); it must
   * stay a runtime `require`, not be bundled. In production the same package
   * talks to Turso over HTTPS.
   */
  serverExternalPackages: ["@libsql/client"],
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
