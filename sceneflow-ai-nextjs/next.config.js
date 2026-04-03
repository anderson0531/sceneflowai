const withSerwist = require("@serwist/next").default({
  cacheOnFrontEndNav: true,
  swSrc: "app/sw.ts", // Path to your service worker
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent caching of root page to ensure correct landing page on hard refresh
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  images: {
    domains: ['source.unsplash.com', 'localhost', 'storage.googleapis.com', 'storage.cloud.google.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || require('./package.json').version,
  },
  serverExternalPackages: ['pg', 'pg-hstore', 'sequelize'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['@/services'] = path.resolve(__dirname, 'src/services')
    config.resolve.alias['@/service-stubs'] = path.resolve(__dirname, 'src/service-stubs')
    
    // Disable module concatenation (scope hoisting) to prevent TDZ errors.
    // Webpack's ModuleConcatenationPlugin merges modules into a single scope,
    // reordering const/let declarations. When shared dependencies (e.g.
    // VideoEditingDialogV2) are split across chunks, this reordering causes
    // 'Cannot access eJ before initialization' in production builds.
    config.optimization = config.optimization || {}
    config.optimization.concatenateModules = false
    
    return config
  }
};

module.exports = withSerwist(nextConfig);