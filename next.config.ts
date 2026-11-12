import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * Image uploads go through a Server Action. The default 1 MB cap rejected
   * ordinary phone photos; the browser compresses them first, and this gives
   * the server room for the remaining payload (Vercel caps requests at 4.5 MB).
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
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
