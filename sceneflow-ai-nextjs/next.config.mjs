import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSerwist } from "@serwist/turbopack";
import withBundleAnalyzer from "@next/bundle-analyzer";

/**
 * next-auth parses NEXTAUTH_URL via `new URL(...)`. An empty string crashes prerender/build (Invalid URL).
 * Vercel projects sometimes define NEXTAUTH_URL with no value — normalize before config runs.
 */
{
  const trimmed = process.env.NEXTAUTH_URL?.trim();
  if (!trimmed) {
    const v = process.env.VERCEL_URL?.trim();
    process.env.NEXTAUTH_URL = v
      ? `https://${v.replace(/^\/+/u, "")}`
      : "http://localhost:3000";
  } else {
    process.env.NEXTAUTH_URL = trimmed;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "1" || process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Repo has multiple package-lock.json files; pin Turbopack to this app so routes/output resolve correctly.
    root: __dirname,
  },
  reactStrictMode: true,
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default bundleAnalyzer(withSerwist(nextConfig));
