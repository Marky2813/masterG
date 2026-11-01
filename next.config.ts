import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Phones and laptops on the same Wi-Fi open the dev server at this machine's LAN address (to join a
// class at /join). Next blocks dev assets for hostnames other than localhost, so the page would never
// hydrate. Allow this machine's own IPv4 addresses, read at startup (the venue Wi-Fi may change them).
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const nextConfig: NextConfig = {
  /* config options here */
  // *.trycloudflare.com: a Cloudflare quick tunnel gives the laptop an https address, so phones get the mic.
  allowedDevOrigins: [...lanHosts, "*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
