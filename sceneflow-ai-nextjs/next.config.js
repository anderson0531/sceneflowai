const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['source.unsplash.com', 'localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || require('./package.json').version,
    NODE_OPTIONS: '--max-old-space-size=3072', // 3GB for memory-intensive operations
  },
  serverExternalPackages: ['pg', 'pg-hstore', 'sequelize'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = config.resolve.alias || {}
    config.resolve.alias['@/services'] = path.resolve(__dirname, 'src/service-stubs/runtime/services')
    return config
  }
};

module.exports = withPWA(nextConfig);