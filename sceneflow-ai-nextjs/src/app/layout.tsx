import type { Metadata, Viewport } from 'next'
import { Inter, Montserrat, Roboto_Mono, Lora } from 'next/font/google'
import './globals.css'

import AuthSessionProvider from '@/components/providers/AuthSessionProvider'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'
import AnimatedProcessingOverlay from '../components/AnimatedProcessingOverlay'
import { CreditsProvider } from '@/contexts/CreditsContext'
import { CookieConsent } from '@/components/ui/CookieConsent'
import { GlobalErrorGuard } from '@/components/providers/GlobalErrorGuard'
import AudioPlayerProvider from '@/context/AudioPlayerProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '600', '700'],
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  weight: ['400', '700'],
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '600'],
  display: 'swap',
})

const SITE_URL = 'https://sceneflowai.com'
const SITE_DESCRIPTION = 'Transform your ideas into professional videos with AI-powered workflow automation'

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SceneFlow AI',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  description:
    'Transform your ideas into professional videos with AI-powered workflow automation. Create scripts, characters, and videos in one integrated platform.',
  url: 'https://sceneflowai.studio',
  image: 'https://sceneflowai.studio/logos/sceneflow-logo.png',
  author: {
    '@type': 'Organization',
    name: 'SceneFlow AI',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Explorer',
      price: '9.99',
      priceCurrency: 'USD',
      description: 'One-time purchase: 3,000 credits to test drive the platform',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '49.00',
      priceCurrency: 'USD',
      description: 'Monthly subscription: 4,500 credits for hobbyists',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '149.00',
      priceCurrency: 'USD',
      description: 'Monthly subscription: 15,000 credits for freelancers',
    },
    {
      '@type': 'Offer',
      name: 'Studio',
      price: '599.00',
      priceCurrency: 'USD',
      description: 'Monthly subscription: 75,000 credits for agencies',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
    bestRating: '5',
    worstRating: '1',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'SceneFlow AI - AI-Powered Video Creation',
    template: '%s | SceneFlow AI',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'SceneFlow AI',
  manifest: '/manifest.json',
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SceneFlow AI',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: 'SceneFlow AI',
    title: 'SceneFlow AI',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: ['/favicon.ico'],
  },
  twitter: {
    card: 'summary',
    title: 'SceneFlow AI',
    description: SITE_DESCRIPTION,
    creator: '@sceneflowai',
    images: ['/favicon.ico'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'SceneFlow AI',
    'msapplication-config': '/icons/browserconfig.xml',
    'msapplication-TileColor': '#00BFA5',
    'msapplication-tap-highlight': 'no',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#00BFA5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} ${robotoMono.variable} ${lora.variable} ${inter.className}`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:outline focus:outline-2 focus:outline-cyan-500 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthSessionProvider>
            <AudioPlayerProvider>
              <CreditsProvider>
                <GlobalHeader />
                <ConditionalLayout>{children}</ConditionalLayout>
                <InstallPrompt />
                <Toaster
                  position="top-right"
                  richColors
                  theme="dark"
                  closeButton
                  toastOptions={{
                    style: {
                      background: '#1f2937',
                      color: '#f3f4f6',
                      border: '1px solid #374151',
                      opacity: 1,
                    },
                    className:
                      'bg-gray-800 text-gray-100 border-gray-700 shadow-lg !opacity-100 whitespace-pre-wrap',
                  }}
                />
                <AnimatedProcessingOverlay />
                <CookieConsent />
                <GlobalErrorGuard />
              </CreditsProvider>
            </AudioPlayerProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
