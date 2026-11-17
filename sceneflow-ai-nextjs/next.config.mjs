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
    "/api/export/previs-stitch": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  // Static public/ assets, docs/, tests, and local encodes must never land in
  // serverless NFT bundles (outputFileTracingRoot is repoRoot = parent of
  // sceneflow-ai-nextjs, so match both app-relative and repoRoot-relative globs).
  outputFileTracingExcludes: {
    "*": [
      "public/videos/**/*.mp4",
      "public/videos/**/*.webm",
      "./public/videos/**",
      "public/landing/video-services/videos/**",
      "./public/landing/video-services/videos/**",
      "public/landing/key-features/animatics/**",
      "./public/landing/key-features/animatics/**",
      "public/**",
      "./public/**",
      "sceneflow-ai-nextjs/public/**",
      "./sceneflow-ai-nextjs/public/**",
      "docs/**",
      "./docs/**",
      "sceneflow-ai-nextjs/docs/**",
      "./sceneflow-ai-nextjs/docs/**",
      "scripts/**",
      "./scripts/**",
      "sceneflow-ai-nextjs/scripts/**",
      "./sceneflow-ai-nextjs/scripts/**",
      "src/__tests__/**",
      "./src/__tests__/**",
      "sceneflow-ai-nextjs/src/__tests__/**",
      "./sceneflow-ai-nextjs/src/__tests__/**",
      "**/*.mp4",
      "**/*.webm",
      "**/*.mov",
      "**/*.pdf",
    ],
    // Video generation & TTS routes run against cloud APIs and must never ship
    // the 75MB ffmpeg-static / ffprobe-static binaries.
    "/api/scenes/[sceneId]/beats/[beatId]/generate-continuous": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
      "sceneflow-ai-nextjs/node_modules/ffmpeg-static/**",
      "**/ffmpeg-static/**",
      "**/ffprobe-static/**",
    ],
    "/api/scenes/[sceneId]/beats/[beatId]/generate-longtake": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
      "sceneflow-ai-nextjs/node_modules/ffmpeg-static/**",
      "**/ffmpeg-static/**",
      "**/ffprobe-static/**",
    ],
    "/api/segments/[segmentId]/generate-asset": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
      "sceneflow-ai-nextjs/node_modules/ffmpeg-static/**",
      "**/ffmpeg-static/**",
      "**/ffprobe-static/**",
    ],
    // Scene dialogue is already at the function size ceiling. Designed voices
    // return WAV, so this route must not ship the ffmpeg binary.
    "/api/vision/generate-scene-audio": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
      "sceneflow-ai-nextjs/node_modules/ffmpeg-static/**",
      "**/ffmpeg-static/**",
      "**/ffprobe-static/**",
    ],
    "/api/tts/google": [
      "node_modules/ffmpeg-static/**",
      "./node_modules/ffmpeg-static/**",
      "sceneflow-ai-nextjs/node_modules/ffmpeg-static/**",
      "**/ffmpeg-static/**",
      "**/ffprobe-static/**",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "lodash",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
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
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/serwist/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *;",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/sw.js",
        destination: "/serwist/sw.js",
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(bundleAnalyzer(withSerwist(nextConfig)));
