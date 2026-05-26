import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Faction artifacts and shared detachment sets are immutable per content hash; the client
    // requests them with a `?v=<sha256>` query, so a data bump produces a new URL.
    const immutable = [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
    ];
    return [
      { source: "/data/factions/:file*", headers: immutable },
      { source: "/data/shared/:file*", headers: immutable },
    ];
  },
};

export default nextConfig;
