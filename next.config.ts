import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Faction artifacts are immutable per content hash; the client requests
        // them with a `?v=<sha256>` query, so a data bump produces a new URL.
        source: "/data/factions/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
