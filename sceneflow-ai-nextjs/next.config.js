const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Custom runtime caching to prevent stale audio files
  runtimeCaching: [
    // CRITICAL: Audio files use NetworkFirst to ensure fresh content after regeneration
    // GCS-hosted audio files should always fetch from network first
    {
      urlPattern: /^https:\/\/storage\.googleapis\.com\/.*\.(?:mp3|wav|ogg)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'gcs-audio-assets',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 3600, // 1 hour max cache for audio
        },
      },
    },
    // Local/other audio files also use NetworkFirst
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'audio-assets',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 3600, // 1 hour
        },
      },
    },
    // Keep default caching for other static assets
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 31536000, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 604800, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 604800,
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-data',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-data-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: ({ url }) => {
        const isSameOrigin = self.origin === url.origin
        if (!isSameOrigin) return false
        const pathname = url.pathname
        if (pathname.startsWith('/api/auth/')) return false
        return pathname.startsWith('/api/')
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: ({ url }) => {
        const isSameOrigin = self.origin === url.origin
        if (!isSameOrigin) return false
        return !url.pathname.startsWith('/api/')
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: ({ url }) => !(self.origin === url.origin),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 3600,
        },
      },
    },
  ],
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
    return config
  }
};

module.exports = withPWA(nextConfig);