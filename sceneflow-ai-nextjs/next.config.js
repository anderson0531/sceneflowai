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
  // 1. Move image domains to remotePatterns
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com", // Example: update with your actual domains
      },
      // Add other domains here...
    ],
  },
  // 2. The 'eslint' block was removed. Use .eslintrc.json for lint rules.
  // 3. Keep your other valid settings like redirects or rewrites here
};

module.exports = withSerwist(nextConfig);