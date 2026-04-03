const withSerwist = require("@serwist/next").default({
  cacheOnFrontEndNav: true,
  swSrc: "app/sw.ts", // Path to your service worker
  swDest: "public/sw.js",
  // Suppress the Turbopack warning since we are forcing Webpack in package.json
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {}, // Explicitly disable Turbopack by providing an empty config
  // This explicitly tells Next.js 16 to expect a Webpack setup
  webpack: (config) => {
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
};

module.exports = withSerwist(nextConfig);