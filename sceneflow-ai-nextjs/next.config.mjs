import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSerwist } from "@serwist/turbopack";
import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

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
/** Monorepo root — must match Vercel's outputFileTracingRoot (/vercel/path0). */
const repoRoot = path.join(__dirname, "..");

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "1" || process.env.ANALYZE === "true",
  openAnalyzer: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    // Repo has multiple package-lock.json files; pin Turbopack to monorepo root (matches tracing).
    root: repoRoot,
  },
  reactStrictMode: true,
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static", "web-push"],
  outputFileTracingIncludes: {
    "/api/sfx/extract-clip-audio": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/tts/google/voice-clone": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  // Hero MP4/WebM in public/ (or leftover local encodes) must not land in
  // serverless NFT. Tracing the whole project with those files produced a
  // 618MB function and failed the 250MB uncompressed limit.
  outputFileTracingExcludes: {
    "*": [
      "public/videos/**/*.mp4",
      "public/videos/**/*.webm",
      "./public/videos/**",
      "**/*.mp4",
      "**/*.webm",
    ],
    // Scene dialogue is already at the function size ceiling. Designed voices
    // return WAV, so this route must not ship the ffmpeg binary.
    "/api/vision/generate-scene-audio": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
    ],
    "/api/tts/google": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
    ],
  },
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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "sfai.studio" }],
        destination: "https://sceneflowai.studio/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.sfai.studio" }],
        destination: "https://sceneflowai.studio/:path*",
        permanent: true,
      },
      {
        source: "/signup",
        destination: "/login?mode=signup",
        permanent: false,
      },
      {
        source: "/early-access",
        destination: "/#pricing",
        permanent: false,
      },
      {
        source: "/early-access/:path*",
        destination: "/#pricing",
        permanent: false,
      },
      {
        source: "/dashboard/workflow/storyboard",
        destination: "/dashboard/workflow/pre-vis",
        permanent: true,
      },
      {
        source: "/share/storyboard/:path*",
        destination: "/share/pre-vis/:path*",
        permanent: true,
      },
      {
        source: "/embed/storyboard/:path*",
        destination: "/embed/pre-vis/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const blob = "https://xxavfkdhdebrqida.public.blob.vercel-storage.com";
    // English and Spanish WebM and 1080p MP4 are committed under public/videos/.
    // Leaving them out of these rewrites keeps those files.
    const blobHeroLocales = "zh|ar";
    return [
      {
        source: "/sw.js",
        destination: "/serwist/sw.js",
      },
      {
        source: `/videos/hero-:locale(${blobHeroLocales}).mp4`,
        destination: `${blob}/landing/hero/sceneflow-hero-:locale-1080p.mp4`,
      },
      {
        source: `/videos/hero-:locale(${blobHeroLocales}).webm`,
        destination: `${blob}/landing/hero/sceneflow-hero-:locale.webm`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(bundleAnalyzer(withSerwist(nextConfig)));
