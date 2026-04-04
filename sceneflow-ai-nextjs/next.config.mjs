import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This helps Next.js 16 gracefully fallback from Turbopack for Serwist
  webpack: (config) => {
    return config;
  },
};

export default withSerwist(nextConfig);